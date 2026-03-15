import type { ProgressResponse } from "@mentat/types";

import { formatDuration, formatSessionDate } from "../lib/utils";
import { SurfaceCard } from "./SurfaceCard";

interface ProgressOverviewCardProps {
  data: ProgressResponse | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  onRefresh: () => Promise<unknown>;
}

export function ProgressOverviewCard({
  data,
  status,
  error,
  onRefresh,
}: ProgressOverviewCardProps) {
  return (
    <SurfaceCard
      eyebrow="Progress"
      title="Table tennis memory"
      description="Recent sessions, streak, and the coaching thread Mentat is trying to carry forward."
      action={
        <button
          className="ghost-button"
          onClick={() => {
            void onRefresh();
          }}
          type="button"
        >
          Refresh
        </button>
      }
    >
      {status === "loading" ? (
        <p className="muted-copy">Loading progress snapshot...</p>
      ) : null}

      {status === "error" && error ? (
        <div className="error-banner">{error}</div>
      ) : null}

      {data ? (
        <div className="stack-md">
          <div className="summary-grid">
            <div className="mini-panel">
              <span className="mini-panel__label">Streak</span>
              <strong>{data.snapshot.streak}</strong>
            </div>
            <div className="mini-panel">
              <span className="mini-panel__label">Sessions</span>
              <strong>{data.snapshot.sessionsCompleted}</strong>
            </div>
            <div className="mini-panel">
              <span className="mini-panel__label">Domain</span>
              <strong>{data.snapshot.domain}</strong>
            </div>
            <div className="mini-panel">
              <span className="mini-panel__label">Trend</span>
              <strong>{data.snapshot.trend}</strong>
            </div>
            <div className="mini-panel">
              <span className="mini-panel__label">Avg top score</span>
              <strong>{data.snapshot.averageTopScore}/10</strong>
            </div>
            <div className="mini-panel">
              <span className="mini-panel__label">Last session</span>
              <strong>
                {data.snapshot.lastSessionDate
                  ? formatSessionDate(data.snapshot.lastSessionDate)
                  : "No sessions"}
              </strong>
            </div>
          </div>

          <div className="callout">
            <p className="callout__title">Latest improvement</p>
            <p>{data.snapshot.latestImprovement ?? "Complete a session to populate this."}</p>
            <p className="section-label">Current focus</p>
            <p>{data.snapshot.currentFocus ?? "No current focus yet."}</p>
          </div>

          <div className="stack-sm">
            <p className="section-label">Recent sessions</p>
            {data.recentSessions.map((session) => (
              <article className="recent-session" key={session.sessionId}>
                <div>
                  <strong>{session.keyImprovement}</strong>
                  <p>{formatSessionDate(session.sessionDate)}</p>
                </div>
                <div className="recent-session__meta">
                  <span>{formatDuration(session.durationSeconds)}</span>
                  <span>{session.personality.replace("_", " ")}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </SurfaceCard>
  );
}
