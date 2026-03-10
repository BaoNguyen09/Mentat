import { Modality, type LiveServerMessage as GeminiLiveServerMessage, type Session as GeminiSession } from "@google/genai";
import type {
  Domain,
  LiveBridgeProvider,
  LiveClientMessage,
  LiveServerMessage,
  Personality,
  SessionStatus,
} from "@mentat/types";
import type { ServerType } from "@hono/node-server";
import type { IncomingMessage } from "node:http";
import { WebSocket, WebSocketServer, type RawData } from "ws";

import { getGeminiClient, getLiveModel, shouldUseMockLiveBridge } from "../lib/gemini";
import { mentatIdentityPrompt } from "../prompts/identity";
import { coachPersonalities } from "../prompts/personality";
import { tableTennisPrompt } from "../prompts/sports/table-tennis";

export interface LiveSessionBridgeConfig {
  userId: string;
  domain: Domain;
  personality: Personality;
}

interface MockState {
  audioChunks: number;
  videoFrames: number;
  textTurns: number;
  coachingMessagesSent: number;
}

interface SessionRecord extends LiveSessionBridgeConfig {
  sessionId: string;
  createdAt: string;
  status: SessionStatus;
  provider: LiveBridgeProvider;
  clientSocket: WebSocket | null;
  liveSession: GeminiSession | null;
  announcedReady: boolean;
  mockState: MockState;
}

const sessionRecords = new Map<string, SessionRecord>();

let websocketServer: WebSocketServer | null = null;

function makeSessionId() {
  return `session-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function buildSystemInstruction(record: SessionRecord) {
  const promptLayers = [
    mentatIdentityPrompt,
    `Coach personality: ${coachPersonalities[record.personality]}`,
    tableTennisPrompt,
    "Coach in live voice. Keep spoken responses short, specific, and corrective.",
    "Prioritize what is visible right now over historical assumptions.",
    "If the frame is bad, ask the player to reposition the phone before giving technical advice.",
    "Treat user interruption as important. Stop the previous thread and coach the new moment.",
  ];

  return promptLayers.join("\n\n");
}

function buildKickoffMessage(record: SessionRecord) {
  return [
    "The player is starting a live table tennis coaching session now.",
    "Begin with a short greeting, ask for a neutral ready stance, and give one correction at a time.",
    `Coach personality for this session: ${record.personality}.`,
  ].join(" ");
}

function sendServerMessage(record: SessionRecord, message: LiveServerMessage) {
  if (!record.clientSocket || record.clientSocket.readyState !== WebSocket.OPEN) {
    return;
  }

  record.clientSocket.send(JSON.stringify(message));
}

function setStatus(record: SessionRecord, status: Extract<SessionStatus, "connecting" | "active" | "complete" | "error">, message?: string) {
  record.status = status;
  sendServerMessage(record, {
    type: "session-status",
    status,
    message,
  });
}

function sendError(record: SessionRecord, message: string) {
  record.status = "error";
  sendServerMessage(record, {
    type: "error",
    message,
  });
}

function parseMessage(raw: RawData): LiveClientMessage | null {
  const text =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? Buffer.concat(raw).toString("utf8")
        : raw instanceof ArrayBuffer
          ? Buffer.from(raw).toString("utf8")
          : raw instanceof SharedArrayBuffer
            ? Buffer.from(new Uint8Array(raw)).toString("utf8")
            : ArrayBuffer.isView(raw)
              ? Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength).toString("utf8")
              : Buffer.from(raw).toString("utf8");

  try {
    return JSON.parse(text) as LiveClientMessage;
  } catch {
    return null;
  }
}

function normalizeText(value: string | undefined) {
  return value?.trim() ?? "";
}

function emitMockCoaching(record: SessionRecord) {
  if (record.provider !== "mock") {
    return;
  }

  const { audioChunks, videoFrames, textTurns, coachingMessagesSent } = record.mockState;

  if (coachingMessagesSent === 0 && videoFrames >= 1) {
    record.mockState.coachingMessagesSent += 1;
    sendServerMessage(record, {
      type: "coach-text",
      text: "I can see you now. Step back half a pace so your feet stay in frame, then hold a neutral ready stance.",
    });
    return;
  }

  if (coachingMessagesSent === 1 && audioChunks >= 6) {
    record.mockState.coachingMessagesSent += 1;
    sendServerMessage(record, {
      type: "coach-text",
      text: "Your voice feed is live. Keep your knees softer and recover to center faster after contact.",
    });
    return;
  }

  if (coachingMessagesSent === 2 && (videoFrames >= 3 || textTurns >= 1)) {
    record.mockState.coachingMessagesSent += 1;
    sendServerMessage(record, {
      type: "coach-text",
      text: "One fix only for the next rally: close the paddle face slightly on forehand contact and do not chase power yet.",
    });
  }
}

function handleMockMessage(record: SessionRecord, message: LiveClientMessage) {
  switch (message.type) {
    case "audio":
      record.mockState.audioChunks += 1;
      emitMockCoaching(record);
      break;
    case "video":
      record.mockState.videoFrames += 1;
      emitMockCoaching(record);
      break;
    case "text": {
      record.mockState.textTurns += 1;
      sendServerMessage(record, {
        type: "coach-text",
        text: `Heard. We will anchor on this: ${message.text}`,
      });
      emitMockCoaching(record);
      break;
    }
    case "activity-start":
    case "activity-end":
    case "audio-end":
    case "ping":
      break;
    default:
      break;
  }
}

function relayGeminiMessage(record: SessionRecord, message: GeminiLiveServerMessage) {
  if (message.setupComplete && !record.announcedReady) {
    record.announcedReady = true;
    sendServerMessage(record, {
      type: "session-ready",
      sessionId: record.sessionId,
      provider: "gemini",
    });
    setStatus(record, "active", "Gemini Live is ready.");
  }

  if (message.serverContent?.inputTranscription?.text) {
    sendServerMessage(record, {
      type: "coach-transcript",
      source: "input",
      text: message.serverContent.inputTranscription.text,
      finished: Boolean(message.serverContent.inputTranscription.finished),
    });
  }

  if (message.serverContent?.outputTranscription?.text) {
    const transcriptText = normalizeText(message.serverContent.outputTranscription.text);

    sendServerMessage(record, {
      type: "coach-transcript",
      source: "output",
      text: transcriptText,
      finished: Boolean(message.serverContent.outputTranscription.finished),
    });

    if (transcriptText && message.serverContent.outputTranscription.finished) {
      sendServerMessage(record, {
        type: "coach-text",
        text: transcriptText,
      });
    }
  }

  if (message.serverContent?.modelTurn?.parts) {
    for (const part of message.serverContent.modelTurn.parts) {
      if (part.inlineData?.data && part.inlineData.mimeType) {
        sendServerMessage(record, {
          type: "coach-audio",
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        });
      }

      const text = normalizeText(part.text);

      if (text) {
        sendServerMessage(record, {
          type: "coach-text",
          text,
        });
      }
    }
  }

  if (message.serverContent?.interrupted) {
    sendServerMessage(record, {
      type: "coach-interrupted",
      message: "The coach output was interrupted by a new input.",
    });
  }

  if (message.serverContent?.waitingForInput) {
    sendServerMessage(record, {
      type: "coach-waiting",
    });
  }

  if (message.usageMetadata) {
    const usage = message.usageMetadata as Record<string, unknown>;
    sendServerMessage(record, {
      type: "usage",
      promptTokenCount:
        typeof usage.promptTokenCount === "number" ? usage.promptTokenCount : undefined,
      responseTokenCount:
        typeof usage.responseTokenCount === "number"
          ? usage.responseTokenCount
          : typeof usage.candidatesTokenCount === "number"
            ? usage.candidatesTokenCount
            : undefined,
      totalTokenCount:
        typeof usage.totalTokenCount === "number" ? usage.totalTokenCount : undefined,
    });
  }

  if (message.goAway?.timeLeft) {
    setStatus(record, "error", `Gemini Live is closing soon (${message.goAway.timeLeft}).`);
  }
}

async function connectGeminiSession(record: SessionRecord) {
  const client = getGeminiClient();

  record.liveSession = await client.live.connect({
    model: getLiveModel(),
    config: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: {
        parts: [{ text: buildSystemInstruction(record) }],
      },
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: process.env.GEMINI_VOICE_NAME ?? "Aoede",
          },
        },
      },
    },
    callbacks: {
      onopen: () => {
        setStatus(record, "connecting", "Connected to Gemini Live.");
      },
      onmessage: (message) => {
        relayGeminiMessage(record, message);
      },
      onerror: (error) => {
        const message =
          error instanceof Error ? error.message : "Gemini Live reported an unknown error.";
        sendError(record, message);
      },
      onclose: () => {
        if (record.status !== "complete" && record.status !== "error") {
          setStatus(record, "complete", "Gemini Live session closed.");
        }
      },
    },
  });

  record.liveSession.sendClientContent({
    turns: [
      {
        role: "user",
        parts: [{ text: buildKickoffMessage(record) }],
      },
    ],
    turnComplete: true,
  });
}

async function initializeLiveSession(record: SessionRecord) {
  setStatus(record, "connecting", "Opening the live coaching bridge.");

  if (record.provider === "mock") {
    record.announcedReady = true;
    sendServerMessage(record, {
      type: "session-ready",
      sessionId: record.sessionId,
      provider: "mock",
    });
    setStatus(record, "active", "Mock live bridge is active because Gemini credentials are not configured.");
    sendServerMessage(record, {
      type: "coach-text",
      text: "Mock live bridge is running. Camera and microphone traffic are still flowing through the same session pipeline.",
    });
    return;
  }

  await connectGeminiSession(record);
}

function closeSessionResources(record: SessionRecord) {
  try {
    record.liveSession?.close();
  } catch {
    // Ignore close errors during cleanup.
  }

  if (record.clientSocket && record.clientSocket.readyState === WebSocket.OPEN) {
    record.clientSocket.close();
  }

  record.liveSession = null;
  record.clientSocket = null;
}

function handleClientMessage(record: SessionRecord, message: LiveClientMessage) {
  if (record.provider === "mock") {
    handleMockMessage(record, message);
    return;
  }

  if (!record.liveSession) {
    sendError(record, "The Gemini Live session is not ready yet.");
    return;
  }

  switch (message.type) {
    case "text": {
      const text = normalizeText(message.text);

      if (!text) {
        return;
      }

      record.liveSession.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      });
      return;
    }
    case "audio":
      record.liveSession.sendRealtimeInput({
        audio: {
          data: message.data,
          mimeType: message.mimeType,
        },
      });
      return;
    case "video":
      record.liveSession.sendRealtimeInput({
        video: {
          data: message.data,
          mimeType: message.mimeType,
        },
      });
      return;
    case "activity-start":
      record.liveSession.sendRealtimeInput({
        activityStart: {},
      });
      return;
    case "activity-end":
      record.liveSession.sendRealtimeInput({
        activityEnd: {},
      });
      return;
    case "audio-end":
      record.liveSession.sendRealtimeInput({
        audioStreamEnd: true,
      });
      return;
    case "ping":
      return;
    default:
      return;
  }
}

async function handleSocketConnection(record: SessionRecord, socket: WebSocket) {
  if (record.clientSocket && record.clientSocket !== socket) {
    try {
      record.clientSocket.close();
    } catch {
      // Ignore replacement close errors.
    }
  }

  record.clientSocket = socket;
  record.liveSession = null;
  record.announcedReady = false;
  record.status = "connecting";

  socket.on("message", (raw) => {
    const message = parseMessage(raw);

    if (!message) {
      sendError(record, "The client sent an invalid live message.");
      return;
    }

    handleClientMessage(record, message);
  });

  socket.on("close", () => {
    try {
      record.liveSession?.close();
    } catch {
      // Ignore close errors during connection teardown.
    }

    record.liveSession = null;
    record.clientSocket = null;
  });

  socket.on("error", () => {
    sendError(record, "The browser live connection closed unexpectedly.");
  });

  try {
    await initializeLiveSession(record);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create the Gemini Live session.";
    sendError(record, message);
  }
}

export function createLiveSessionBridge(config: LiveSessionBridgeConfig) {
  const sessionId = makeSessionId();
  const record: SessionRecord = {
    ...config,
    sessionId,
    createdAt: new Date().toISOString(),
    status: "connecting",
    provider: shouldUseMockLiveBridge() ? "mock" : "gemini",
    clientSocket: null,
    liveSession: null,
    announcedReady: false,
    mockState: {
      audioChunks: 0,
      videoFrames: 0,
      textTurns: 0,
      coachingMessagesSent: 0,
    },
  };

  sessionRecords.set(sessionId, record);

  return {
    status: record.status,
    sessionId,
    wsUrl: `/ws/session?sessionId=${encodeURIComponent(sessionId)}`,
    provider: record.provider,
  };
}

export function releaseLiveSession(sessionId: string) {
  const record = sessionRecords.get(sessionId);

  if (!record) {
    return;
  }

  closeSessionResources(record);
  sessionRecords.delete(sessionId);
}

function rejectUpgrade(requestSocket: IncomingMessage["socket"], statusCode: number, message: string) {
  requestSocket.write(
    `HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\n\r\n`,
  );
  requestSocket.destroy();
}

export function attachLiveSessionBridge(server: ServerType) {
  if (websocketServer) {
    return;
  }

  websocketServer = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "", "http://localhost");

    if (url.pathname !== "/ws/session") {
      return;
    }

    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      rejectUpgrade(socket, 400, "Missing session id");
      return;
    }

    const record = sessionRecords.get(sessionId);

    if (!record) {
      rejectUpgrade(socket, 404, "Unknown session id");
      return;
    }

    websocketServer?.handleUpgrade(request, socket, head, (websocket) => {
      void handleSocketConnection(record, websocket);
    });
  });
}
