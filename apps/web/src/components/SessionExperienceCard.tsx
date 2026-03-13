import { useEffect, useMemo, useRef } from "react";
import { CheckCircle, Circle, RotateCcw, Square } from "lucide-react";

import type { LiveBridgeProvider, SessionStatus } from "@mentat/types";

import type { SessionEvent } from "../hooks/useSession";
import { cx, formatDuration, formatSessionDate } from "../lib/utils";
import { SurfaceCard } from "./SurfaceCard";

interface SessionExperienceCardProps {
  status: SessionStatus;
  sessionId: string | null;
  wsUrl: string | null;
  bridgeProvider: LiveBridgeProvider | null;
  mediaStream: MediaStream | null;
  sessionSeconds: number;
  events: SessionEvent[];
  error: string | null;
  onFinalize: () => Promise<unknown>;
  onReset: () => void;
}

const statusCopy: Record<SessionStatus, string> = {
  idle: "Waiting for you to start the next coaching run.",
  connecting: "Mentat is preparing the live coaching bridge.",
  active: "Live coaching is running. Keep the camera stable and focus on one correction.",
  finalizing: "Mentat is turning the session into a memory, score, and fix list.",
  complete: "Post-session review is complete and ready for the next drill block.",
  error: "The live flow hit a problem. Reset and try again.",
};

interface ReadinessCheck {
  id: string;
  label: string;
  pattern: RegExp;
}

const READINESS_CHECKS: ReadinessCheck[] = [
  { id: "framing", label: "Full body in frame", pattern: /step back|tilt|full body|in frame|can see you|see your/i },
  { id: "racket", label: "Racket visible", pattern: /paddle|racket|see (the|your)|holding/i },
  { id: "stance", label: "Ready stance confirmed", pattern: /ready.*let.?s go|stance.*(good|great|correct|looks)|good.*ready|let.?s go/i },
];

function detectReadiness(events: SessionEvent[]) {
  const coachTexts = events.filter((e) => e.kind === "coach").map((e) => e.label);
  const allText = coachTexts.join(" ");
  return READINESS_CHECKS.map((check) => ({
    ...check,
    passed: check.pattern.test(allText),
  }));
}

export function SessionExperienceCard({
  status,
  sessionId,
  wsUrl,
  bridgeProvider,
  mediaStream,
  sessionSeconds,
  events,
  error,
  onFinalize,
  onReset,
}: SessionExperienceCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const visibleEvents = [...events].reverse().slice(0, 6);
  const readinessChecks = useMemo(() => detectReadiness(events), [events]);
  const allReady = readinessChecks.every((c) => c.passed);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = mediaStream;

    if (mediaStream) {
      void videoRef.current.play().catch(() => undefined);
    }
  }, [mediaStream]);

  return (
    <SurfaceCard
      eyebrow="Live flow"
      title="Session state"
      description="This is the coaching control room for connection state, timeline, and finalization."
      action={
        <div className={cx("status-chip", `status-chip--${status}`)}>
          {status}
        </div>
      }
    >
      <div className="stack-md">
        <div className="live-preview">
          <div className="live-preview__frame">
            {mediaStream ? (
              <video
                className="live-preview__video"
                muted
                playsInline
                ref={videoRef}
              />
            ) : null}
            <div className="live-preview__badge">
              {bridgeProvider ? `${bridgeProvider} bridge` : "Phone camera"}
            </div>
            <div className="live-preview__copy">
              <p className="eyebrow">Live coaching stance</p>
              <h3>Side-on full-body view</h3>
              <p>{statusCopy[status]}</p>
            </div>
          </div>
          <div className="live-preview__meta">
            <div className="mini-panel">
              <span className="mini-panel__label">Timer</span>
              <strong>{formatDuration(sessionSeconds)}</strong>
            </div>
            <div className="mini-panel">
              <span className="mini-panel__label">Session id</span>
              <strong>{sessionId ?? "Not started"}</strong>
            </div>
            <div className="mini-panel">
              <span className="mini-panel__label">Bridge path</span>
              <strong>{wsUrl ?? "/ws/session"}</strong>
            </div>
            <div className="mini-panel">
              <span className="mini-panel__label">Video + audio</span>
              <strong>{mediaStream ? "Streaming" : "Not started"}</strong>
            </div>
          </div>
        </div>

        {status === "active" && !allReady ? (
          <div className="readiness-gate">
            <h3 className="readiness-gate__title">Pre-session readiness check</h3>
            <p className="readiness-gate__desc">
              Mentat is checking your setup before coaching begins.
            </p>
            <ul className="readiness-gate__list">
              {readinessChecks.map((check) => (
                <li
                  className={cx(
                    "readiness-gate__item",
                    check.passed && "readiness-gate__item--passed"
                  )}
                  key={check.id}
                >
                  {check.passed ? (
                    <CheckCircle size={18} />
                  ) : (
                    <Circle size={18} />
                  )}
                  {check.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="action-row">
          <button
            className="primary-button"
            disabled={status !== "active"}
            onClick={() => {
              void onFinalize();
            }}
            type="button"
          >
            <Square size={18} />
            End session and analyze
          </button>
          <button
            className="ghost-button"
            disabled={status === "connecting" || status === "finalizing"}
            onClick={onReset}
            type="button"
          >
            <RotateCcw size={16} />
            Reset flow
          </button>
        </div>

        <div className="timeline">
          <div className="timeline__header">
            <h3>Live session timeline</h3>
            <span>{visibleEvents.length} recent events</span>
          </div>
          <div className="timeline__list">
            {visibleEvents.map((event) => (
              <article className="timeline-item" key={event.id}>
                <div
                  className={cx("timeline-item__dot", `timeline-item__dot--${event.kind}`)}
                />
                <div>
                  <p className="timeline-item__label">{event.label}</p>
                  <span className="timeline-item__meta">
                    {event.kind} · {formatSessionDate(event.createdAt)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
