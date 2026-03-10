import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  Domain,
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

export interface SessionEvent {
  id: string;
  label: string;
  kind: "system" | "memory" | "coach" | "analysis";
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

export function useSession({
  userId,
  domain,
  personality,
  onFinalized,
}: UseSessionOptions) {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [context, setContext] = useState<SessionContextResponse | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [events, setEvents] = useState<SessionEvent[]>(makeInitialEvents);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>(
    makeAnalysisSteps,
  );
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const scheduledTimeoutsRef = useRef<number[]>([]);
  const startedAtRef = useRef<number | null>(null);

  const clearScheduledTimeouts = useCallback(() => {
    for (const timeoutId of scheduledTimeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }
    scheduledTimeoutsRef.current = [];
  }, []);

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

  useEffect(() => {
    return () => {
      clearScheduledTimeouts();
    };
  }, [clearScheduledTimeouts]);

  const resetSession = useCallback(() => {
    clearScheduledTimeouts();
    setStatus("idle");
    setSessionId(null);
    setWsUrl(null);
    setSummary(null);
    setError(null);
    setSessionSeconds(0);
    setEvents(makeInitialEvents());
    setAnalysisSteps(makeAnalysisSteps());
  }, [clearScheduledTimeouts]);

  const beginSession = useCallback(async () => {
    if (!userId.trim()) {
      setError("Enter a user id before starting a session.");
      return;
    }

    clearScheduledTimeouts();
    setError(null);
    setSummary(null);
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
      const nextContext = await loadContext();
      appendEvent(
        "Loaded prior accountability focus and recent progress context.",
        "memory",
      );

      if (nextContext?.accountability?.[0]) {
        appendEvent(
          `Opening reminder: ${nextContext.accountability[0]}`,
          "coach",
        );
      }

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

      const timeoutId = window.setTimeout(() => {
        setStatus("active");
        appendEvent(
          "Live coaching is active. Keep the phone side-on and let Mentat focus on one correction at a time.",
          "coach",
        );
      }, 900);

      scheduledTimeoutsRef.current.push(timeoutId);
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Unable to start the coaching session.";

      setStatus("error");
      setError(message);
      appendEvent(message, "system");
    }
  }, [
    appendEvent,
    clearScheduledTimeouts,
    domain,
    loadContext,
    personality,
    userId,
  ]);

  const finalizeCurrentSession = useCallback(async () => {
    if (!sessionId || !userId.trim()) {
      setError("There is no active session to finalize.");
      return;
    }

    setStatus("finalizing");
    setError(null);
    setAnalysisSteps(makeAnalysisSteps());
    appendEvent("Ending live session and starting post-session analysis.", "analysis");

    try {
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
  }, [appendEvent, onFinalized, sessionId, userId]);

  const currentFocus = useMemo(() => {
    return context?.accountability?.[0] ?? "Lock in recovery stance after contact.";
  }, [context]);

  return {
    status,
    sessionId,
    wsUrl,
    context,
    summary,
    events,
    error,
    analysisSteps,
    sessionSeconds,
    currentFocus,
    beginSession,
    finalizeCurrentSession,
    resetSession,
    refreshContext: loadContext,
  };
}
