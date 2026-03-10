import { Play, RefreshCcw } from "lucide-react";

import type { Personality, SessionContextResponse } from "@mentat/types";

import { cx } from "../lib/utils";
import { SurfaceCard } from "./SurfaceCard";

interface CoachSetupCardProps {
  userId: string;
  personality: Personality;
  context: SessionContextResponse | null;
  currentFocus: string;
  isBusy: boolean;
  contextLoading: boolean;
  onUserIdChange: (value: string) => void;
  onPersonalityChange: (value: Personality) => void;
  onRefreshContext: () => Promise<unknown>;
  onBeginSession: () => Promise<unknown>;
}

const personalities: Personality[] = [
  "sensei",
  "hype",
  "drill_sergeant",
];

const personalityCopy: Record<Personality, string> = {
  sensei: "Calm, technical, one fix at a time.",
  hype: "Fast encouragement and momentum.",
  drill_sergeant: "Strict, sharp, accountability-first.",
};

export function CoachSetupCard({
  userId,
  personality,
  context,
  currentFocus,
  isBusy,
  contextLoading,
  onUserIdChange,
  onPersonalityChange,
  onRefreshContext,
  onBeginSession,
}: CoachSetupCardProps) {
  return (
    <SurfaceCard
      eyebrow="Session entry"
      title="Start a live table tennis session"
      description="Load prior accountability, pick a coaching mode, and enter the live flow."
      action={
        <button
          className="ghost-button"
          disabled={contextLoading || isBusy}
          onClick={() => {
            void onRefreshContext();
          }}
          type="button"
        >
          <RefreshCcw size={16} />
          Refresh context
        </button>
      }
    >
      <div className="stack-md">
        <label className="field">
          <span className="field__label">Demo user id</span>
          <input
            className="text-input"
            disabled={isBusy}
            onChange={(event) => onUserIdChange(event.target.value)}
            placeholder="alex-demo"
            value={userId}
          />
        </label>

        <div className="stack-sm">
          <span className="field__label">Coaching mode</span>
          <div className="pill-row">
            {personalities.map((entry) => (
              <button
                key={entry}
                className={cx(
                  "pill-button",
                  entry === personality && "pill-button--active",
                )}
                disabled={isBusy}
                onClick={() => onPersonalityChange(entry)}
                type="button"
              >
                <strong>{entry.replace("_", " ")}</strong>
                <span>{personalityCopy[entry]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="callout">
          <p className="callout__title">Loaded accountability focus</p>
          <p>{currentFocus}</p>
          <ul className="bullet-list">
            {(context?.accountability ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="setup-grid">
          <div className="mini-panel">
            <span className="mini-panel__label">Domain</span>
            <strong>Table tennis</strong>
          </div>
          <div className="mini-panel">
            <span className="mini-panel__label">Profile</span>
            <strong>{context?.profile.name ?? "Alex"}</strong>
          </div>
          <div className="mini-panel">
            <span className="mini-panel__label">Streak</span>
            <strong>{context?.profile.streak ?? 0} sessions</strong>
          </div>
        </div>

        <button
          className="primary-button"
          disabled={isBusy || !userId.trim()}
          onClick={() => {
            void onBeginSession();
          }}
          type="button"
        >
          <Play size={18} />
          Start coaching session
        </button>
      </div>
    </SurfaceCard>
  );
}
