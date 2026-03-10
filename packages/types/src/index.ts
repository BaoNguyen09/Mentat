export type Sport = "table-tennis";
export type Personality = "sensei" | "hype" | "drill_sergeant";

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

export interface SessionSummary {
  sessionDate: string;
  sport: Sport;
  personality: Personality;
  topScores: Array<{ area: keyof Score; score: number }>;
  weakAreas: Array<{ area: keyof Score; score: number }>;
  memorableMoments: string[];
  fixList: FixItem[];
  keyImprovement: string;
}

export interface Profile {
  userId: string;
  name: string;
  sports: Sport[];
  streak: number;
  createdAt: string;
}

export interface ProgressSnapshot {
  userId: string;
  sport: Sport;
  streak: number;
  sessionsCompleted: number;
}

export interface SportPromptModule {
  sport: Sport;
  systemPrompt: string;
  focusAreas: string[];
}
