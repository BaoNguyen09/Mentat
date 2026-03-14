// ── Domain types ────────────────────────────────

export type Domain =
  | "table-tennis"
  | "chess"
  | "kitchen"
  | "room-reset"
  | "language"
  | "planning";

/** @deprecated Use Domain instead */
export type Sport = Domain;

export type Personality = "sensei" | "hype" | "drill_sergeant";

// ── Session lifecycle ───────────────────────────

export type SessionStatus =
  | "idle"
  | "connecting"
  | "readiness"
  | "active"
  | "finalizing"
  | "complete"
  | "error";

// ── Scoring ─────────────────────────────────────

export interface Score {
  formAccuracy: number;
  consistency: number;
  technique: number;
  improvement: number;
  engagement: number;
}

export interface FixItem {
  item: string;
  specificObservation: string;
  drill: string;
}

// ── Session data ────────────────────────────────

export interface SessionSummary {
  sessionId: string;
  userId: string;
  sessionDate: string;
  domain: Domain;
  personality: Personality;
  durationSeconds: number;
  compressedSummary: string;
  topScores: Array<{ area: keyof Score; score: number }>;
  weakAreas: Array<{ area: keyof Score; score: number }>;
  memorableMoments: string[];
  fixList: FixItem[];
  keyImprovement: string;
}

// ── User data ───────────────────────────────────

export interface Profile {
  userId: string;
  name: string;
  domains: Domain[];
  streak: number;
  createdAt: string;
}

export interface ProgressSnapshot {
  userId: string;
  domain: Domain;
  streak: number;
  sessionsCompleted: number;
  averageTopScore: number;
  lastSessionDate: string | null;
  latestImprovement: string | null;
  currentFocus: string | null;
  trend: "up" | "flat" | "down";
}

// ── Prompt modules ──────────────────────────────

export interface DomainPromptModule {
  domain: Domain;
  systemPrompt: string;
  focusAreas: string[];
}

/** @deprecated Use DomainPromptModule instead */
export type SportPromptModule = DomainPromptModule;

// ── API request/response contracts ──────────────

// POST /api/sessions/start
export interface StartSessionRequest {
  userId: string;
  domain: Domain;
  personality: Personality;
}

export interface StartSessionResponse {
  sessionId: string;
  wsUrl: string;
  status: SessionStatus;
}

export type LiveBridgeProvider = "gemini" | "mock";

export interface ReadinessCheckState {
  id: "framing" | "racket" | "stance";
  label: string;
  passed: boolean;
  detail?: string;
}

export type LiveClientMessage =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "audio";
      data: string;
      mimeType: string;
    }
  | {
      type: "video";
      data: string;
      mimeType: string;
    }
  | {
      type: "activity-start";
    }
  | {
      type: "activity-end";
    }
  | {
      type: "audio-end";
    }
  | {
      type: "ping";
    };

export type LiveServerMessage =
  | {
      type: "session-ready";
      sessionId: string;
      provider: LiveBridgeProvider;
    }
  | {
      type: "session-status";
      status: Extract<
        SessionStatus,
        "connecting" | "readiness" | "active" | "complete" | "error"
      >;
      message?: string;
    }
  | {
      type: "readiness-update";
      checks: ReadinessCheckState[];
      ready: boolean;
    }
  | {
      type: "coach-text";
      text: string;
    }
  | {
      type: "coach-audio";
      data: string;
      mimeType: string;
    }
  | {
      type: "coach-transcript";
      source: "input" | "output";
      text: string;
      finished: boolean;
    }
  | {
      type: "coach-interrupted";
      message?: string;
    }
  | {
      type: "coach-waiting";
    }
  | {
      type: "usage";
      promptTokenCount?: number;
      responseTokenCount?: number;
      totalTokenCount?: number;
    }
  | {
      type: "error";
      message: string;
    };

// POST /api/sessions/finalize
export interface FinalizeSessionRequest {
  sessionId: string;
  userId: string;
}

export interface FinalizeSessionResponse {
  summary: SessionSummary;
  status: "complete";
}

// GET /api/sessions/context/:userId
export interface SessionContextResponse {
  userId: string;
  domain: Domain;
  recentSummaries: SessionSummary[];
  accountability: string[];
  latestFixList: FixItem[];
  memoryDigest: string[];
  profile: Profile;
}

// GET /api/progress/:userId
export interface ProgressResponse {
  snapshot: ProgressSnapshot;
  recentSessions: SessionSummary[];
}
