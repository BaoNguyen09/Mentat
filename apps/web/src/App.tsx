import { useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  House,
  Mic,
  PenSquare,
  Radio,
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
import { cx, isToday } from "./lib/utils";

type WorkspaceView = "home" | "live" | "knowledge";

interface KnowledgePreset {
  domainGroup: string;
  subdomain: string;
  guidance: string;
}

interface QuickAction {
  id: string;
  title: string;
  detail: string;
  cta: string;
  done: boolean;
  run: () => void;
}

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
  const [knowledgePreset, setKnowledgePreset] = useState<KnowledgePreset | null>({
    domainGroup: "Sports",
    subdomain: "Chess",
    guidance:
      "Speak what happened, what pattern repeated, and what you should do next time.",
  });
  const [onboarding, setOnboarding] = useState<LocalOnboardingState>(
    readStoredOnboarding,
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);

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
  const primaryGoalText =
    onboarding.primaryGoal.trim() || "Use tonight for deliberate practice instead of drift.";
  const storedChessFocus = onboarding.chessFocus.trim();
  const storedTableTennisFocus = onboarding.tableTennisFocus.trim();
  const recentLiveSummary = progress.data?.recentSessions.find((entry) =>
    isToday(entry.sessionDate),
  );
  const chessLoggedToday = Boolean(chessEntry && isToday(chessEntry.createdAt));
  const tableTennisLoggedToday = Boolean(
    tableTennisEntry && isToday(tableTennisEntry.createdAt),
  );
  const liveSessionToday = Boolean(recentLiveSummary);

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

  const openKnowledge = (preset: KnowledgePreset) => {
    setKnowledgePreset(preset);
    setView("knowledge");
  };

  const openLive = () => {
    setView("live");
  };

  const quickActions: QuickAction[] = [
    {
      id: "chess-reflection",
      title: "Log your latest chess session",
      detail: chessLoggedToday
        ? chessEntry?.summary ??
          "Your chess reflection is already saved for today."
        : "Capture the result, the pattern, and the next adjustment before it fades.",
      cta: "Open chess note",
      done: chessLoggedToday,
      run: () =>
        openKnowledge({
          domainGroup: "Sports",
          subdomain: "Chess",
          guidance:
            "Start with the result, then say what repeated, where you tilted, and what you should review next.",
        }),
    },
    {
      id: "tt-live",
      title: "Run a table tennis readiness check",
      detail: liveSessionToday
        ? recentLiveSummary?.keyImprovement ??
          "You already completed a live table tennis session today."
        : progressSnapshot?.currentFocus ??
          "Stand side-on with the racket visible and let Mentat clear the live readiness gate.",
      cta: "Open live coaching",
      done: liveSessionToday,
      run: openLive,
    },
    {
      id: "tt-note",
      title: "Store the main table tennis fix",
      detail: tableTennisLoggedToday
        ? tableTennisEntry?.summary ??
          "Your table tennis practice note is already stored for today."
        : fixList[0]?.drill ??
          tableTennisEntry?.summary ??
          "Save one practice note so the next live session starts with context.",
      cta: "Open table tennis note",
      done: tableTennisLoggedToday,
      run: () =>
        openKnowledge({
          domainGroup: "Sports",
          subdomain: "Table Tennis",
          guidance:
            "Say what felt off, what one fix matters most, and what drill you want to repeat next time.",
        }),
    },
  ];

  const recommendedAction = quickActions.find((action) => !action.done) ?? quickActions[0];
  const todayCompletionCount = [
    chessLoggedToday,
    liveSessionToday,
    tableTennisLoggedToday,
  ].filter(Boolean).length;
  const todayCompletionLabel =
    todayCompletionCount === 3
      ? "Today is fully logged."
      : `${todayCompletionCount}/3 core steps done today`;

  const navItems: Array<{
    view: WorkspaceView;
    label: string;
    icon: typeof House;
  }> = [
    { view: "home", label: "Home", icon: House },
    { view: "live", label: "Live", icon: Radio },
    { view: "knowledge", label: "Knowledge", icon: Mic },
  ];

  return (
    <main className="app-shell app-shell--mentat">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">M</div>
          <div className="brand-copy">
            <strong>Mentat</strong>
            <span>{greetingName}</span>
          </div>
        </div>

        <nav className="workspace-nav" aria-label="Workspace view">
          {navItems.map((entry) => (
            <button
              key={entry.view}
              className={cx(
                "nav-pill",
                entry.view === view && "nav-pill--active",
              )}
              onClick={() => setView(entry.view)}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </nav>
      </header>

      {view === "home" ? (
        <section className="start-view">
          <div className="start-panel">
            <p className="eyebrow">Start</p>
            <h1>Mentat</h1>
            <p className="start-panel__lede">
              {recommendedAction?.title ?? "Start with a short voice note."}
            </p>
            <p className="start-panel__support">
              {recommendedAction?.detail ?? primaryGoalText}
            </p>

            <button
              aria-label={recommendedAction?.cta ?? "Start"}
              className="voice-launch"
              onClick={() => {
                recommendedAction?.run();
              }}
              type="button"
            >
              <Mic size={34} />
            </button>

            <p className="start-panel__hint">
              {recommendedAction?.cta ?? "Open chess note"}
            </p>

            <div className="start-meta">
              <div className="mini-panel">
                <span className="mini-panel__label">Today</span>
                <strong>{todayCompletionLabel}</strong>
              </div>
              <div className="mini-panel">
                <span className="mini-panel__label">Current focus</span>
                <strong>
                  {recommendedAction?.title ??
                    progressSnapshot?.currentFocus ??
                    primaryGoalText}
                </strong>
              </div>
            </div>

            <div className="start-links">
              <button
                className="ghost-button"
                onClick={() =>
                  openKnowledge({
                    domainGroup: "Sports",
                    subdomain: "Chess",
                    guidance:
                      "Start with the result, then say what repeated, where you tilted, and what you should review next.",
                  })
                }
                type="button"
              >
                <BrainCircuit size={16} />
                Chess note
              </button>
              <button className="ghost-button" onClick={openLive} type="button">
                <Swords size={16} />
                Live session
              </button>
              <button
                className="ghost-button"
                onClick={() => setIsEditingProfile((current) => !current)}
                type="button"
              >
                <PenSquare size={16} />
                {isEditingProfile ? "Close setup" : "Edit focus"}
              </button>
            </div>
          </div>

          {isEditingProfile ? (
            <SurfaceCard
              eyebrow="Setup"
              title="Edit your focus"
              description="Only the few settings Mentat needs to aim the next step."
            >
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
                    Save focus
                  </button>
                </div>
              </div>
            </SurfaceCard>
          ) : null}
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
              preset={knowledgePreset}
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

      <nav className="mobile-nav" aria-label="Workspace view">
        {navItems.map((entry) => {
          const Icon = entry.icon;

          return (
            <button
              key={entry.view}
              className={cx(
                "mobile-nav__button",
                entry.view === view && "mobile-nav__button--active",
              )}
              onClick={() => setView(entry.view)}
              type="button"
            >
              <Icon size={18} />
              <span>{entry.label}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}
