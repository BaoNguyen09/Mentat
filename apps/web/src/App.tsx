import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  PenSquare,
  Swords,
} from "lucide-react";

import type { DomainKnowledgeEntry, Personality } from "@mentat/types";

import { AnalysisStepper } from "./components/AnalysisStepper";
import { CoachSetupCard } from "./components/CoachSetupCard";
import { FixListCard } from "./components/FixListCard";
import { KnowledgeCaptureCard } from "./components/KnowledgeCaptureCard";
import { PerformanceSummaryCard } from "./components/PerformanceSummaryCard";
import { ProgressOverviewCard } from "./components/ProgressOverviewCard";
import { SessionExperienceCard } from "./components/SessionExperienceCard";
import { SurfaceCard } from "./components/SurfaceCard";
import { useKnowledge } from "./hooks/useKnowledge";
import { useProgress } from "./hooks/useProgress";
import { useSession } from "./hooks/useSession";
import { LOCAL_USER_ID } from "./lib/local-profile";
import { cx } from "./lib/utils";

type WorkspaceView = "home" | "live" | "knowledge";

interface LocalOnboardingState {
  complete: boolean;
  name: string;
  primaryGoal: string;
  chessFocus: string;
  tableTennisFocus: string;
  accountabilityStyle: Personality;
}

const onboardingStorageKey = "mentat-onboarding";

const defaultOnboardingState: LocalOnboardingState = {
  complete: false,
  name: "",
  primaryGoal: "",
  chessFocus: "",
  tableTennisFocus: "",
  accountabilityStyle: "drill_sergeant",
};

function readStoredOnboarding() {
  if (typeof window === "undefined") {
    return defaultOnboardingState;
  }

  try {
    const raw = window.localStorage.getItem(onboardingStorageKey);

    if (!raw) {
      return defaultOnboardingState;
    }

    const parsed = JSON.parse(raw) as Partial<LocalOnboardingState>;
    return {
      complete: parsed.complete ?? false,
      name: parsed.name ?? "",
      primaryGoal: parsed.primaryGoal ?? "",
      chessFocus: parsed.chessFocus ?? "",
      tableTennisFocus: parsed.tableTennisFocus ?? "",
      accountabilityStyle: parsed.accountabilityStyle ?? "drill_sergeant",
    };
  } catch {
    return defaultOnboardingState;
  }
}

function findLatestEntry(
  entries: DomainKnowledgeEntry[],
  matcher: (entry: DomainKnowledgeEntry) => boolean,
) {
  return entries.find(matcher) ?? null;
}

export function App() {
  const [userId] = useState(LOCAL_USER_ID);
  const [view, setView] = useState<WorkspaceView>("home");
  const [personality, setPersonality] = useState<Personality>("drill_sergeant");
  const [onboarding, setOnboarding] = useState<LocalOnboardingState>(
    readStoredOnboarding,
  );
  const [isEditingProfile, setIsEditingProfile] = useState(
    !readStoredOnboarding().complete,
  );

  const progress = useProgress(userId);
  const knowledge = useKnowledge(userId);
  const session = useSession({
    userId,
    domain: "table-tennis",
    personality,
    onFinalized: progress.refresh,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      onboardingStorageKey,
      JSON.stringify(onboarding),
    );
  }, [onboarding]);

  useEffect(() => {
    if (onboarding.complete) {
      setPersonality(onboarding.accountabilityStyle);
    }
  }, [onboarding]);

  const progressSnapshot = progress.data?.snapshot;
  const fixList = session.summary?.fixList ?? [];

  const chessEntry = useMemo(
    () =>
      findLatestEntry(
        knowledge.entries,
        (entry) =>
          /chess/i.test(entry.subdomain) || /chess/i.test(entry.domainGroup),
      ),
    [knowledge.entries],
  );

  const tableTennisEntry = useMemo(
    () =>
      findLatestEntry(
        knowledge.entries,
        (entry) =>
          /table/i.test(entry.subdomain) ||
          /table/i.test(entry.domainGroup) ||
          /tennis/i.test(entry.subdomain) ||
          /tennis/i.test(entry.domainGroup),
      ),
    [knowledge.entries],
  );

  const greetingName = onboarding.name.trim() || "Mentat user";
  const storedChessFocus = onboarding.chessFocus.trim();
  const storedTableTennisFocus = onboarding.tableTennisFocus.trim();
  const chessNextStep =
    chessEntry?.nextAction ??
    (storedChessFocus || "Capture a short chess reflection by voice.");
  const tableTennisNextStep =
    fixList[0]?.drill ??
    progressSnapshot?.currentFocus ??
    (storedTableTennisFocus || session.currentFocus);

  const saveOnboarding = () => {
    const nextState = {
      ...onboarding,
      complete:
        Boolean(onboarding.name.trim()) &&
        Boolean(onboarding.primaryGoal.trim()) &&
        Boolean(onboarding.chessFocus.trim()) &&
        Boolean(onboarding.tableTennisFocus.trim()),
    };

    setOnboarding(nextState);
    setPersonality(nextState.accountabilityStyle);
    setIsEditingProfile(!nextState.complete);
  };

  return (
    <main className="app-shell app-shell--mentat">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">M</div>
          <div className="brand-copy">
            <strong>Mentat</strong>
            <span>single-user coaching workspace</span>
          </div>
        </div>

        <nav className="workspace-nav" aria-label="Workspace view">
          {(["home", "live", "knowledge"] as WorkspaceView[]).map((entry) => (
            <button
              key={entry}
              className={cx(
                "nav-pill",
                entry === view && "nav-pill--active",
              )}
              onClick={() => setView(entry)}
              type="button"
            >
              {entry}
            </button>
          ))}
        </nav>
      </header>

      <section className="masthead">
        <div className="masthead__copy">
          <p className="eyebrow">Personal operating space</p>
          <h1>
            One place for practice, reflection, and the next move that actually
            matters.
          </h1>
          <p className="masthead__lede">
            Mentat should feel like your own coach, not a task demo. Use the
            knowledge workspace to capture chess lessons by voice, then switch
            into the live table tennis flow when you want camera-guided
            coaching.
          </p>
          <div className="masthead__actions">
            <button
              className="primary-button"
              onClick={() => setView("knowledge")}
              type="button"
            >
              <BrainCircuit size={18} />
              Capture chess reflection
            </button>
            <button
              className="ghost-button"
              onClick={() => setView("live")}
              type="button"
            >
              <Swords size={16} />
              Start table tennis
            </button>
          </div>
        </div>

        <div className="masthead__stats">
          <article className="dashboard-stat">
            <span>Status</span>
            <strong>{session.status}</strong>
          </article>
          <article className="dashboard-stat">
            <span>Current live focus</span>
            <strong>{session.currentFocus}</strong>
          </article>
          <article className="dashboard-stat">
            <span>Knowledge entries</span>
            <strong>{knowledge.entries.length}</strong>
          </article>
          <article className="dashboard-stat">
            <span>Session streak</span>
            <strong>{progressSnapshot?.streak ?? 0}</strong>
          </article>
        </div>
      </section>

      {view === "home" ? (
        <section className="dashboard-grid">
          <div className="stack-lg">
            <SurfaceCard
              eyebrow="Home"
              title={
                onboarding.complete
                  ? `Welcome back, ${greetingName}`
                  : "Set up your Mentat workspace"
              }
              description={
                onboarding.complete
                  ? "This is the personal dashboard layer that should orient you before you drop into a live session or a voice note."
                  : "Take one minute to tell Mentat what you care about. That gives the home screen something real to organize around."
              }
              action={
                onboarding.complete ? (
                  <button
                    className="ghost-button"
                    onClick={() => setIsEditingProfile((current) => !current)}
                    type="button"
                  >
                    <PenSquare size={16} />
                    {isEditingProfile ? "Close editor" : "Edit profile"}
                  </button>
                ) : null
              }
            >
              {isEditingProfile || !onboarding.complete ? (
                <div className="profile-form">
                  <div className="profile-form__grid">
                    <label className="field">
                      <span className="field__label">Your name</span>
                      <input
                        className="text-input"
                        onChange={(event) =>
                          setOnboarding((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Paul"
                        value={onboarding.name}
                      />
                    </label>

                    <label className="field">
                      <span className="field__label">Primary goal</span>
                      <input
                        className="text-input"
                        onChange={(event) =>
                          setOnboarding((current) => ({
                            ...current,
                            primaryGoal: event.target.value,
                          }))
                        }
                        placeholder="Use evenings for focused growth instead of drift."
                        value={onboarding.primaryGoal}
                      />
                    </label>

                    <label className="field">
                      <span className="field__label">Chess focus</span>
                      <input
                        className="text-input"
                        onChange={(event) =>
                          setOnboarding((current) => ({
                            ...current,
                            chessFocus: event.target.value,
                          }))
                        }
                        placeholder="Stop tilt-queuing after blitz losses."
                        value={onboarding.chessFocus}
                      />
                    </label>

                    <label className="field">
                      <span className="field__label">Table tennis focus</span>
                      <input
                        className="text-input"
                        onChange={(event) =>
                          setOnboarding((current) => ({
                            ...current,
                            tableTennisFocus: event.target.value,
                          }))
                        }
                        placeholder="Get a repeatable ready stance and recovery."
                        value={onboarding.tableTennisFocus}
                      />
                    </label>
                  </div>

                  <div className="stack-sm">
                    <span className="field__label">Coaching tone</span>
                    <div className="pill-row">
                      {(["sensei", "hype", "drill_sergeant"] as Personality[]).map(
                        (entry) => (
                          <button
                            key={entry}
                            className={cx(
                              "pill-button",
                              onboarding.accountabilityStyle === entry &&
                                "pill-button--active",
                            )}
                            onClick={() =>
                              setOnboarding((current) => ({
                                ...current,
                                accountabilityStyle: entry,
                              }))
                            }
                            type="button"
                          >
                            <strong>{entry.replace("_", " ")}</strong>
                            <span>
                              {entry === "sensei"
                                ? "Calm and technical."
                                : entry === "hype"
                                  ? "Fast energy and momentum."
                                  : "Strict and accountability-first."}
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="action-row">
                    <button
                      className="primary-button"
                      onClick={saveOnboarding}
                      type="button"
                    >
                      <CheckCircle2 size={18} />
                      Save workspace
                    </button>
                  </div>
                </div>
              ) : (
                <div className="summary-grid">
                  <div className="mini-panel">
                    <span className="mini-panel__label">Primary goal</span>
                    <strong>{onboarding.primaryGoal}</strong>
                  </div>
                  <div className="mini-panel">
                    <span className="mini-panel__label">Chess focus</span>
                    <strong>{onboarding.chessFocus}</strong>
                  </div>
                  <div className="mini-panel">
                    <span className="mini-panel__label">Table tennis focus</span>
                    <strong>{onboarding.tableTennisFocus}</strong>
                  </div>
                  <div className="mini-panel">
                    <span className="mini-panel__label">Coaching tone</span>
                    <strong>
                      {onboarding.accountabilityStyle.replace("_", " ")}
                    </strong>
                  </div>
                  <div className="mini-panel">
                    <span className="mini-panel__label">Latest sync</span>
                    <strong>{knowledge.syncMessage ?? "Not synced yet"}</strong>
                  </div>
                  <div className="mini-panel">
                    <span className="mini-panel__label">Knowledge base</span>
                    <strong>{knowledge.entries.length} saved entries</strong>
                  </div>
                </div>
              )}
            </SurfaceCard>

            <SurfaceCard
              eyebrow="Tonight"
              title="What Mentat thinks you should do next"
              description="This should become the clearest part of the product: what to do now, why, and where to go."
            >
              <div className="stack-md">
                <div className="callout">
                  <p className="callout__title">Recommended next action</p>
                  <p>{chessNextStep}</p>
                </div>
                <div className="domain-rail">
                  <button
                    className="domain-card"
                    onClick={() => setView("knowledge")}
                    type="button"
                  >
                    <div className="domain-card__topline">
                      <span>Chess</span>
                      <ArrowRight size={16} />
                    </div>
                    <strong>
                      {chessEntry?.summary ?? "Capture a quick reflection by voice."}
                    </strong>
                    <p>
                      {chessEntry?.nextAction ??
                        (storedChessFocus ||
                          "Use this space for losses, wins, tilt, and study notes.")}
                    </p>
                  </button>

                  <button
                    className="domain-card"
                    onClick={() => setView("live")}
                    type="button"
                  >
                    <div className="domain-card__topline">
                      <span>Table tennis</span>
                      <ArrowRight size={16} />
                    </div>
                    <strong>
                      {fixList[0]?.item ??
                        progressSnapshot?.currentFocus ??
                        "Run a live session"}
                    </strong>
                    <p>{tableTennisNextStep}</p>
                  </button>
                </div>
              </div>
            </SurfaceCard>
          </div>

          <div className="stack-lg">
            <SurfaceCard
              eyebrow="Overview"
              title="Domain board"
              description="A simple read of where Mentat has traction today."
            >
              <div className="stack-md">
                <article className="overview-row">
                  <div>
                    <span className="section-label">Chess memory</span>
                    <strong>
                      {chessEntry?.summary ?? "No chess reflection saved yet."}
                    </strong>
                  </div>
                  <span className="status-chip status-chip--memory">
                    {chessEntry ? "tracked" : "empty"}
                  </span>
                </article>
                <article className="overview-row">
                  <div>
                    <span className="section-label">Table tennis focus</span>
                    <strong>
                      {progressSnapshot?.currentFocus ?? session.currentFocus}
                    </strong>
                  </div>
                  <span className="status-chip status-chip--active">
                    {session.status}
                  </span>
                </article>
                <article className="overview-row">
                  <div>
                    <span className="section-label">Latest table tennis note</span>
                    <strong>
                      {tableTennisEntry?.summary ?? "No table tennis note yet."}
                    </strong>
                  </div>
                  <span className="status-chip status-chip--pending">
                    {tableTennisEntry ? "saved" : "new"}
                  </span>
                </article>
              </div>
            </SurfaceCard>

            <ProgressOverviewCard
              data={progress.data}
              error={progress.error}
              onRefresh={progress.refresh}
              status={progress.status}
            />
          </div>
        </section>
      ) : null}

      {view === "live" ? (
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
              personality={personality}
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
            <AnalysisStepper
              status={session.status}
              steps={session.analysisSteps}
            />
            <PerformanceSummaryCard summary={session.summary} />
            <FixListCard fixList={fixList} />
          </div>
        </section>
      ) : null}

      {view === "knowledge" ? (
        <section className="app-grid">
          <div className="stack-lg">
            <KnowledgeCaptureCard
              entries={knowledge.entries}
              error={knowledge.error}
              isLoading={knowledge.status === "loading"}
              onSave={async (input) => {
                await knowledge.saveEntry(input);
                await knowledge.sync();
              }}
              onSync={async () => {
                await knowledge.sync();
              }}
              syncMessage={knowledge.syncMessage}
            />
          </div>

          <div className="stack-lg">
            <SurfaceCard
              eyebrow="How to use this"
              title="Best current workflow"
              description="This is the realistic knowledge loop that exists today."
            >
              <div className="stack-md">
                <div className="callout">
                  <p className="callout__title">For chess</p>
                  <p>
                    After a session, dictate what happened, where you tilted,
                    and what the next review step should be. Mentat will save
                    the note and sync it into Obsidian.
                  </p>
                </div>
                <div className="callout">
                  <p className="callout__title">For table tennis</p>
                  <p>
                    Use this workspace for practice notes, then switch into the
                    live tab when you want readiness checks and guided coaching.
                  </p>
                </div>
              </div>
            </SurfaceCard>

            <ProgressOverviewCard
              data={progress.data}
              error={progress.error}
              onRefresh={progress.refresh}
              status={progress.status}
            />
          </div>
        </section>
      ) : null}
    </main>
  );
}
