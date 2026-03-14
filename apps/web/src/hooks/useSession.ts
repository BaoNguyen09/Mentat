import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  Domain,
  LiveBridgeProvider,
  LiveClientMessage,
  LiveServerMessage,
  Personality,
  SessionContextResponse,
  SessionStatus,
  SessionSummary,
} from "@mentat/types";

import {
  fetchSessionContext,
  finalizeActiveSession,
  startSession,
} from "../lib/api";
import {
  base64ToFloat32,
  blobToBase64,
  float32ToPcm16,
  pcm16ToBase64,
  readSampleRate,
  resolveWebSocketUrl,
} from "../lib/live-media";

export interface SessionEvent {
  id: string;
  label: string;
  kind: "system" | "memory" | "coach" | "analysis" | "user";
  createdAt: string;
}

export interface AnalysisStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "complete";
}

interface UseSessionOptions {
  userId: string;
  domain: Domain;
  personality: Personality;
  onFinalized?: () => Promise<void> | void;
}

type AudioContextCtor = typeof AudioContext;

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function makeInitialEvents(): SessionEvent[] {
  return [
    {
      id: makeId("event"),
      label: "Load your coaching context, then start a live table tennis session.",
      kind: "system",
      createdAt: new Date().toISOString(),
    },
  ];
}

function makeAnalysisSteps(): AnalysisStep[] {
  return [
    {
      id: "close-loop",
      title: "Close live coaching loop",
      description: "Freeze the session window and prepare the replay summary.",
      status: "pending",
    },
    {
      id: "score-technique",
      title: "Score technique and consistency",
      description: "Turn the session into score ranges for the dashboard.",
      status: "pending",
    },
    {
      id: "generate-fix-list",
      title: "Build the fix list",
      description: "Surface the few changes Mentat wants you to repeat next time.",
      status: "pending",
    },
    {
      id: "refresh-memory",
      title: "Refresh progress memory",
      description: "Write the latest coaching output back into the progress view.",
      status: "pending",
    },
  ];
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function getAudioContextCtor(): AudioContextCtor | null {
  const nextWindow = window as Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

  return nextWindow.AudioContext ?? nextWindow.webkitAudioContext ?? null;
}

export function useSession({
  userId,
  domain,
  personality,
  onFinalized,
}: UseSessionOptions) {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [bridgeProvider, setBridgeProvider] = useState<LiveBridgeProvider | null>(
    null,
  );
  const [context, setContext] = useState<SessionContextResponse | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [events, setEvents] = useState<SessionEvent[]>(makeInitialEvents);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>(
    makeAnalysisSteps,
  );
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const startedAtRef = useRef<number | null>(null);
  const statusRef = useRef<SessionStatus>("idle");
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const bridgeReadyRef = useRef(false);
  const closingRef = useRef(false);
  const liveVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const frameCaptureBusyRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSinkRef = useRef<GainNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackCursorRef = useRef(0);
  const playbackNodesRef = useRef<AudioBufferSourceNode[]>([]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const appendEvent = useCallback(
    (label: string, kind: SessionEvent["kind"]) => {
      setEvents((current) => [
        ...current,
        {
          id: makeId("event"),
          label,
          kind,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [],
  );

  const sendClientMessage = useCallback((message: LiveClientMessage) => {
    const websocket = websocketRef.current;

    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    websocket.send(JSON.stringify(message));
  }, []);

  const loadContext = useCallback(async () => {
    if (!userId.trim()) {
      setContext(null);
      return null;
    }

    const nextContext = await fetchSessionContext(userId.trim());
    setContext(nextContext);
    return nextContext;
  }, [userId]);

  useEffect(() => {
    void loadContext().catch(() => {
      setContext(null);
    });
  }, [loadContext]);

  useEffect(() => {
    if (status !== "active") {
      return;
    }

    startedAtRef.current = Date.now();
    setSessionSeconds(0);

    const intervalId = window.setInterval(() => {
      if (!startedAtRef.current) {
        return;
      }

      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setSessionSeconds(elapsed);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [status]);

  const resetPlayback = useCallback(async () => {
    for (const node of playbackNodesRef.current) {
      try {
        node.stop();
      } catch {
        // Ignore stop failures while clearing interrupted playback.
      }

      node.disconnect();
    }

    playbackNodesRef.current = [];
    playbackCursorRef.current = 0;

    if (playbackContextRef.current) {
      const contextToClose = playbackContextRef.current;
      playbackContextRef.current = null;

      await contextToClose.close().catch(() => undefined);
    }
  }, []);

  const ensurePlaybackContext = useCallback(async (sampleRate: number) => {
    const ctor = getAudioContextCtor();

    if (!ctor) {
      return null;
    }

    let context = playbackContextRef.current;

    if (!context || context.state === "closed") {
      context = new ctor({
        sampleRate,
      });
      playbackContextRef.current = context;
      playbackCursorRef.current = context.currentTime;
    }

    if (context.state === "suspended") {
      await context.resume();
    }

    return context;
  }, []);

  const queueCoachAudio = useCallback(
    async (base64Audio: string, mimeType: string) => {
      const sampleRate = readSampleRate(mimeType, 24_000);
      const context = await ensurePlaybackContext(sampleRate);

      if (!context) {
        return;
      }

      const audioData = base64ToFloat32(base64Audio);
      const buffer = context.createBuffer(1, audioData.length, sampleRate);
      buffer.copyToChannel(audioData, 0);

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);

      const nextStartTime = Math.max(context.currentTime + 0.01, playbackCursorRef.current);
      source.start(nextStartTime);
      playbackCursorRef.current = nextStartTime + buffer.duration;
      playbackNodesRef.current.push(source);

      source.onended = () => {
        playbackNodesRef.current = playbackNodesRef.current.filter(
          (node) => node !== source,
        );
      };
    },
    [ensurePlaybackContext],
  );

  const stopMediaCapture = useCallback(async () => {
    bridgeReadyRef.current = false;

    if (frameIntervalRef.current) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current.onaudioprocess = null;
      audioProcessorRef.current = null;
    }

    if (audioSourceRef.current) {
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }

    if (audioSinkRef.current) {
      audioSinkRef.current.disconnect();
      audioSinkRef.current = null;
    }

    if (audioContextRef.current) {
      const contextToClose = audioContextRef.current;
      audioContextRef.current = null;
      await contextToClose.close().catch(() => undefined);
    }

    if (liveVideoElementRef.current) {
      liveVideoElementRef.current.pause();
      liveVideoElementRef.current.srcObject = null;
      liveVideoElementRef.current = null;
    }

    for (const track of mediaStreamRef.current?.getTracks() ?? []) {
      track.stop();
    }

    mediaStreamRef.current = null;
    setMediaStream(null);
    frameCaptureBusyRef.current = false;
  }, []);

  const closeSocket = useCallback(() => {
    const websocket = websocketRef.current;
    websocketRef.current = null;

    if (!websocket) {
      return;
    }

    try {
      websocket.close();
    } catch {
      // Ignore websocket close errors during teardown.
    }
  }, []);

  const teardownLiveTransport = useCallback(async () => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      sendClientMessage({
        type: "audio-end",
      });
    }

    closeSocket();
    await stopMediaCapture();
    await resetPlayback();
  }, [closeSocket, resetPlayback, sendClientMessage, stopMediaCapture]);

  const startMediaCapture = useCallback(
    async (stream: MediaStream) => {
      mediaStreamRef.current = stream;
      setMediaStream(stream);

      const captureVideo = document.createElement("video");
      captureVideo.autoplay = true;
      captureVideo.muted = true;
      captureVideo.playsInline = true;
      captureVideo.srcObject = stream;
      liveVideoElementRef.current = captureVideo;

      await captureVideo.play().catch(() => undefined);

      const canvas = document.createElement("canvas");
      const context2d = canvas.getContext("2d");

      frameIntervalRef.current = window.setInterval(() => {
        if (
          !bridgeReadyRef.current ||
          !context2d ||
          !liveVideoElementRef.current ||
          liveVideoElementRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
          frameCaptureBusyRef.current
        ) {
          return;
        }

        const sourceVideo = liveVideoElementRef.current;
        const width = sourceVideo.videoWidth || 768;
        const height = sourceVideo.videoHeight || 432;
        const scale = Math.min(1, 768 / Math.max(width, height));

        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));

        context2d.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);
        frameCaptureBusyRef.current = true;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              frameCaptureBusyRef.current = false;
              return;
            }

            void blobToBase64(blob)
              .then((data) => {
                sendClientMessage({
                  type: "video",
                  data,
                  mimeType: "image/jpeg",
                });
              })
              .finally(() => {
                frameCaptureBusyRef.current = false;
              });
          },
          "image/jpeg",
          0.72,
        );
      }, 1000);

      const ctor = getAudioContextCtor();

      if (!ctor) {
        appendEvent("Browser audio capture is unavailable in this environment.", "system");
        return;
      }

      const audioContext = new ctor({
        sampleRate: 16_000,
      });
      audioContextRef.current = audioContext;

      if (audioContext.state === "suspended") {
        await audioContext.resume().catch(() => undefined);
      }

      const sourceNode = audioContext.createMediaStreamSource(stream);
      const processorNode = audioContext.createScriptProcessor(2048, 1, 1);
      const sinkNode = audioContext.createGain();
      sinkNode.gain.value = 0;

      processorNode.onaudioprocess = (event) => {
        if (!bridgeReadyRef.current) {
          return;
        }

        const channel = event.inputBuffer.getChannelData(0);
        const pcmChunk = float32ToPcm16(channel);

        sendClientMessage({
          type: "audio",
          data: pcm16ToBase64(pcmChunk),
          mimeType: "audio/pcm;rate=16000",
        });
      };

      sourceNode.connect(processorNode);
      processorNode.connect(sinkNode);
      sinkNode.connect(audioContext.destination);

      audioSourceRef.current = sourceNode;
      audioProcessorRef.current = processorNode;
      audioSinkRef.current = sinkNode;
    },
    [appendEvent, sendClientMessage],
  );

  const currentFocus = useMemo(() => {
    return context?.accountability?.[0] ?? "Lock in recovery stance after contact.";
  }, [context]);

  const handleServerMessage = useCallback(
    (message: LiveServerMessage) => {
      switch (message.type) {
        case "session-ready":
          bridgeReadyRef.current = true;
          setBridgeProvider(message.provider);
          setStatus("active");
          appendEvent(
            `${message.provider === "gemini" ? "Gemini Live" : "Mock live bridge"} is ready. Start moving and let Mentat watch one correction at a time.`,
            "system",
          );
          sendClientMessage({
            type: "text",
            text: `Current accountability focus: ${currentFocus}. Hold the player to this unless something more urgent becomes visible.`,
          });
          return;
        case "session-status":
          setStatus(message.status);
          if (message.message) {
            appendEvent(
              message.message,
              message.status === "active" ? "coach" : "system",
            );
          }
          return;
        case "coach-text":
          appendEvent(message.text, "coach");
          return;
        case "coach-transcript":
          if (message.source === "input" && message.finished && message.text.trim()) {
            appendEvent(`You: ${message.text.trim()}`, "user");
          }
          return;
        case "coach-audio":
          void queueCoachAudio(message.data, message.mimeType);
          return;
        case "coach-interrupted":
          appendEvent(
            message.message ?? "The coach interrupted the previous response to handle a newer moment.",
            "system",
          );
          void resetPlayback();
          return;
        case "coach-waiting":
          return;
        case "usage":
          return;
        case "error":
          setStatus("error");
          setError(message.message);
          appendEvent(message.message, "system");
          return;
        default:
          return;
      }
    },
    [appendEvent, currentFocus, queueCoachAudio, resetPlayback, sendClientMessage],
  );

  const beginSession = useCallback(async () => {
    if (!userId.trim()) {
      setError("Enter a user id before starting a session.");
      return;
    }

    closingRef.current = false;
    bridgeReadyRef.current = false;
    setError(null);
    setSummary(null);
    setBridgeProvider(null);
    setAnalysisSteps(makeAnalysisSteps());
    setEvents([
      {
        id: makeId("event"),
        label: "Preparing coaching context for this session.",
        kind: "system",
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      await teardownLiveTransport();

      const nextContext = await loadContext();
      appendEvent(
        "Loaded prior accountability focus and recent progress context.",
        "memory",
      );

      if (nextContext?.memoryDigest?.[0]) {
        appendEvent(
          `Recent memory: ${nextContext.memoryDigest[0]}`,
          "memory",
        );
      }

      if (nextContext?.accountability?.[0]) {
        appendEvent(
          `Opening reminder: ${nextContext.accountability[0]}`,
          "coach",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
        },
        audio: true,
      });

      await startMediaCapture(stream);

      const response = await startSession({
        userId: userId.trim(),
        domain,
        personality,
      });

      setSessionId(response.sessionId);
      setWsUrl(response.wsUrl);
      setStatus(response.status);
      appendEvent(
        `Session ${response.sessionId} created. Connecting to ${response.wsUrl}.`,
        "system",
      );

      const websocket = new WebSocket(resolveWebSocketUrl(response.wsUrl));
      websocketRef.current = websocket;

      websocket.addEventListener("open", () => {
        appendEvent("Browser live socket connected. Waiting for Mentat to finish setup.", "system");
      });

      websocket.addEventListener("message", (event) => {
        const payload = JSON.parse(event.data as string) as LiveServerMessage;
        handleServerMessage(payload);
      });

      websocket.addEventListener("error", () => {
        setStatus("error");
        setError("The browser could not keep the live coaching socket open.");
        appendEvent(
          "The browser could not keep the live coaching socket open.",
          "system",
        );
      });

      websocket.addEventListener("close", () => {
        if (closingRef.current || statusRef.current === "finalizing" || statusRef.current === "complete") {
          return;
        }

        if (statusRef.current !== "error") {
          setStatus("error");
          setError("The live coaching connection closed before analysis finished.");
          appendEvent(
            "The live coaching connection closed before analysis finished.",
            "system",
          );
        }
      });
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Unable to start the coaching session.";

      closingRef.current = true;
      await teardownLiveTransport();
      setStatus("error");
      setError(message);
      appendEvent(message, "system");
    }
  }, [
    appendEvent,
    domain,
    handleServerMessage,
    loadContext,
    personality,
    startMediaCapture,
    teardownLiveTransport,
    userId,
  ]);

  const finalizeCurrentSession = useCallback(async () => {
    if (!sessionId || !userId.trim()) {
      setError("There is no active session to finalize.");
      return;
    }

    closingRef.current = true;
    setStatus("finalizing");
    setError(null);
    setAnalysisSteps(makeAnalysisSteps());
    appendEvent("Ending live session and starting post-session analysis.", "analysis");

    try {
      await teardownLiveTransport();

      const responsePromise = finalizeActiveSession({
        sessionId,
        userId: userId.trim(),
      });

      const stepSequence: Array<[number, string]> = [
        [0, "Live coaching window closed. Holding the last rally in memory."],
        [1, "Scoring form, technique, engagement, and consistency."],
        [2, "Generating the next-session fix list and drills."],
        [3, "Refreshing progress and accountability memory."],
      ];

      for (const [index, message] of stepSequence) {
        setAnalysisSteps((current) =>
          current.map((step, stepIndex) => {
            if (stepIndex < index) {
              return { ...step, status: "complete" };
            }

            if (stepIndex === index) {
              return { ...step, status: "active" };
            }

            return { ...step, status: "pending" };
          }),
        );

        appendEvent(message, "analysis");
        await sleep(450);
      }

      const response = await responsePromise;

      setAnalysisSteps((current) =>
        current.map((step) => ({ ...step, status: "complete" })),
      );
      setSummary(response.summary);
      setStatus(response.status);
      appendEvent(
        `Analysis complete. Key improvement: ${response.summary.keyImprovement}`,
        "coach",
      );

      if (onFinalized) {
        await onFinalized();
      }
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Unable to finalize the session.";

      setStatus("error");
      setError(message);
      appendEvent(message, "system");
    }
  }, [appendEvent, onFinalized, sessionId, teardownLiveTransport, userId]);

  const resetSession = useCallback(() => {
    closingRef.current = true;
    void teardownLiveTransport();
    setStatus("idle");
    setSessionId(null);
    setWsUrl(null);
    setBridgeProvider(null);
    setSummary(null);
    setError(null);
    setSessionSeconds(0);
    setEvents(makeInitialEvents());
    setAnalysisSteps(makeAnalysisSteps());
  }, [teardownLiveTransport]);

  useEffect(() => {
    return () => {
      closingRef.current = true;
      void teardownLiveTransport();
    };
  }, [teardownLiveTransport]);

  return {
    status,
    sessionId,
    wsUrl,
    bridgeProvider,
    context,
    summary,
    events,
    error,
    analysisSteps,
    sessionSeconds,
    currentFocus,
    mediaStream,
    beginSession,
    finalizeCurrentSession,
    resetSession,
    refreshContext: loadContext,
  };
}
