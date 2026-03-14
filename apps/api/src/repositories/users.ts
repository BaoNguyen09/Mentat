import type { Domain, Profile, ProgressSnapshot, SessionSummary } from "@mentat/types";

import { getFirestoreClient, isFirestoreConfigured } from "../lib/firestore.js";
import { validateProgressSnapshot } from "../lib/validators.js";
import { readLocalStore, updateLocalStore } from "./local-store.js";
import { getAllSessionSummaries } from "./sessions.js";

const PROFILES_COLLECTION = "profiles";
const PROGRESS_COLLECTION = "progress";

const defaultProfile = (userId: string): Profile => ({
  userId,
  name: "You",
  domains: ["table-tennis"],
  streak: 0,
  createdAt: new Date().toISOString(),
});

const defaultProgress = (userId: string, domain: Domain): ProgressSnapshot => ({
  userId,
  domain,
  streak: 0,
  sessionsCompleted: 0,
  averageTopScore: 0,
  lastSessionDate: null,
  latestImprovement: null,
  currentFocus: null,
  trend: "flat",
});

function calculateStreak(dates: string[]) {
  const uniqueDates = [...new Set(dates.map((date) => date.slice(0, 10)))]
    .sort()
    .reverse();

  if (uniqueDates.length === 0) {
    return 0;
  }

  let streak = 1;

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = new Date(uniqueDates[index - 1]);
    const current = new Date(uniqueDates[index]);
    const diffDays = Math.round(
      (previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 1) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

function getAverageTopScore(summary: SessionSummary) {
  if (summary.topScores.length === 0) {
    return 0;
  }

  return (
    summary.topScores.reduce((total, entry) => total + entry.score, 0) /
    summary.topScores.length
  );
}

function deriveTrend(scoreSeries: number[]) {
  if (scoreSeries.length < 2) {
    return "flat" as const;
  }

  const latest = scoreSeries[scoreSeries.length - 1];
  const previous = scoreSeries[scoreSeries.length - 2];

  if (latest >= previous + 0.5) {
    return "up" as const;
  }

  if (latest <= previous - 0.5) {
    return "down" as const;
  }

  return "flat" as const;
}

function deriveProgressSnapshot(
  userId: string,
  domain: Domain,
  sessions: SessionSummary[],
): ProgressSnapshot {
  const domainSessions = sessions
    .filter((session) => session.domain === domain)
    .sort((left, right) => left.sessionDate.localeCompare(right.sessionDate));

  if (domainSessions.length === 0) {
    return defaultProgress(userId, domain);
  }

  const scoreSeries = domainSessions.map((session) => getAverageTopScore(session));
  const latestSession = domainSessions[domainSessions.length - 1];
  const averageSeries =
    scoreSeries.reduce((total, score) => total + score, 0) / scoreSeries.length;

  return validateProgressSnapshot({
    userId,
    domain,
    streak: calculateStreak(domainSessions.map((session) => session.sessionDate)),
    sessionsCompleted: domainSessions.length,
    averageTopScore: averageSeries,
    lastSessionDate: latestSession.sessionDate,
    latestImprovement: latestSession.keyImprovement,
    currentFocus: latestSession.fixList[0]?.item ?? null,
    trend: deriveTrend(scoreSeries),
  });
}

export async function getUserProfile(userId: string): Promise<Profile> {
  if (!isFirestoreConfigured()) {
    const store = await readLocalStore();
    return store.profiles[userId] ?? defaultProfile(userId);
  }

  const db = getFirestoreClient();
  const doc = await db.collection(PROFILES_COLLECTION).doc(userId).get();
  return doc.exists ? (doc.data() as Profile) : defaultProfile(userId);
}

export async function getProgressSnapshot(
  userId: string,
  domain: Domain,
): Promise<ProgressSnapshot> {
  const sessions = await getAllSessionSummaries(userId);
  const derived = deriveProgressSnapshot(userId, domain, sessions);

  if (!isFirestoreConfigured()) {
    await updateLocalStore((store) => {
      store.progress[`${userId}_${domain}`] = derived;
    });
    return derived;
  }

  const db = getFirestoreClient();
  const docId = `${userId}_${domain}`;
  await db.collection(PROGRESS_COLLECTION).doc(docId).set(derived);
  return derived;
}

export async function updateUserProgress(
  userId: string,
  domain: Domain,
): Promise<ProgressSnapshot> {
  return getProgressSnapshot(userId, domain);
}

export async function saveUserProfile(profile: Profile): Promise<void> {
  if (!isFirestoreConfigured()) {
    await updateLocalStore((store) => {
      store.profiles[profile.userId] = profile;
    });
    return;
  }

  const db = getFirestoreClient();
  await db.collection(PROFILES_COLLECTION).doc(profile.userId).set(profile);
}
