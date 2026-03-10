import type { SessionSummary } from "@mentat/types";

import {
  formatDuration,
  formatSessionDate,
  scoreToPercent,
} from "../lib/utils";
import { SurfaceCard } from "./SurfaceCard";

interface PerformanceSummaryCardProps {
  summary: SessionSummary | null;
}

export function PerformanceSummaryCard({
  summary,
}: PerformanceSummaryCardProps) {
  return (
    <SurfaceCard
      eyebrow="Session output"
      title="Performance summary"
      description="The immediate takeaway from the completed coaching run."
    >
      {!summary ? (
        <p className="muted-copy">
          End a live session to see scores, memorable moments, and the headline
          improvement.
        </p>
      ) : (
        <div className="stack-md">
          <div className="summary-grid">
            <div className="mini-panel">
              <span className="mini-panel__label">Completed</span>
              <strong>{formatSessionDate(summary.sessionDate)}</strong>
            </div>
            <div className="mini-panel">
              <span className="mini-panel__label">Duration</span>
              <strong>{formatDuration(summary.durationSeconds)}</strong>
            </div>
            <div className="mini-panel">
              <span className="mini-panel__label">Mode</span>
              <strong>{summary.personality.replace("_", " ")}</strong>
            </div>
          </div>

          <div className="callout">
            <p className="callout__title">Key improvement</p>
            <p>{summary.keyImprovement}</p>
          </div>

          <div className="score-grid">
            <div>
              <p className="section-label">Top scores</p>
              <div className="stack-sm">
                {summary.topScores.map((entry) => (
                  <div key={entry.area}>
                    <div className="score-row">
                      <span>{entry.area}</span>
                      <strong>{entry.score}/10</strong>
                    </div>
                    <div className="score-bar">
                      <div
                        className="score-bar__fill"
                        style={{ width: `${scoreToPercent(entry.score)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="section-label">Weak areas</p>
              <div className="stack-sm">
                {summary.weakAreas.map((entry) => (
                  <div key={entry.area}>
                    <div className="score-row">
                      <span>{entry.area}</span>
                      <strong>{entry.score}/10</strong>
                    </div>
                    <div className="score-bar">
                      <div
                        className="score-bar__fill score-bar__fill--warning"
                        style={{ width: `${scoreToPercent(entry.score)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="section-label">Memorable moments</p>
            <ul className="bullet-list">
              {summary.memorableMoments.map((moment) => (
                <li key={moment}>{moment}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}
