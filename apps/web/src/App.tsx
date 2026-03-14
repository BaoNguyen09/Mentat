import { useEffect, useState } from "react";
import { BrainCircuit, Sparkles, Trophy } from "lucide-react";

import type { Personality } from "@mentat/types";

import { AnalysisStepper } from "./components/AnalysisStepper";
import { CoachSetupCard } from "./components/CoachSetupCard";
import { FixListCard } from "./components/FixListCard";
import { PerformanceSummaryCard } from "./components/PerformanceSummaryCard";
import { ProgressOverviewCard } from "./components/ProgressOverviewCard";
import { SessionExperienceCard } from "./components/SessionExperienceCard";
import { useProgress } from "./hooks/useProgress";
import { useSession } from "./hooks/useSession";

const userIdStorageKey = "mentat-user-id";

function getInitialUserId() {
  if (typeof window === "undefined") {
    return "alex-demo";
  }

  return window.localStorage.getItem(userIdStorageKey) ?? "alex-demo";
}

export function App() {
  const [userId, setUserId] = useState(getInitialUserId);
  const [personality, setPersonality] = useState<Personality>("sensei");

  const progress = useProgress(userId);
  const session = useSession({
    userId,
    domain: "table-tennis",
    personality,
    onFinalized: progress.refresh,
  });

  useEffect(() => {
    window.localStorage.setItem(userIdStorageKey, userId);
  }, [userId]);

  const progressSnapshot = progress.data?.snapshot;
  const fixList = session.summary?.fixList ?? [];

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Mentat issue #7</p>
          <h1>Live coaching flow for the table tennis MVP</h1>
          <p className="hero__lede">
            This screen is the demo-ready web flow: start a session, make live
            state obvious, finalize with visible analysis steps, and bring the
            fix list plus progress memory back into one place.
          </p>
        </div>

        <div className="hero__stats">
          <article className="hero-stat">
            <BrainCircuit size={18} />
            <div>
              <span>Current focus</span>
              <strong>{session.currentFocus}</strong>
            </div>
          </article>
          <article className="hero-stat">
            <Trophy size={18} />
            <div>
              <span>Streak</span>
              <strong>{progressSnapshot?.streak ?? 0} sessions</strong>
            </div>
          </article>
          <article className="hero-stat">
            <Sparkles size={18} />
            <div>
              <span>Status</span>
              <strong>{session.status}</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="app-grid">
        <div className="stack-lg">
          <CoachSetupCard
            context={session.context}
            contextLoading={session.status === "connecting"}
            currentFocus={session.currentFocus}
            isBusy={
              session.status === "connecting" ||
              session.status === "active" ||
              session.status === "finalizing"
            }
            onBeginSession={session.beginSession}
            onPersonalityChange={setPersonality}
            onRefreshContext={session.refreshContext}
            onUserIdChange={setUserId}
            personality={personality}
            userId={userId}
          />

          <SessionExperienceCard
            bridgeProvider={session.bridgeProvider}
            error={session.error}
            events={session.events}
            mediaStream={session.mediaStream}
            onFinalize={session.finalizeCurrentSession}
            onReset={session.resetSession}
            readinessChecks={session.readinessChecks}
            sessionId={session.sessionId}
            sessionSeconds={session.sessionSeconds}
            status={session.status}
            wsUrl={session.wsUrl}
          />
        </div>

        <div className="stack-lg">
          <AnalysisStepper status={session.status} steps={session.analysisSteps} />
          <PerformanceSummaryCard summary={session.summary} />
          <FixListCard fixList={fixList} />
          <ProgressOverviewCard
            data={progress.data}
            error={progress.error}
            onRefresh={progress.refresh}
            status={progress.status}
          />
        </div>
      </section>
    </main>
  );
}
