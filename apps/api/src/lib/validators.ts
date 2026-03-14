import type { FixItem, ProgressSnapshot, Score, SessionSummary } from "@mentat/types";

function ensureString(value: string, field: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`Missing required field: ${field}`);
  }

  return trimmed;
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) {
    return 1;
  }

  return Math.max(1, Math.min(10, Math.round(score)));
}

function validateScoreEntries(
  entries: Array<{ area: keyof Score; score: number }>,
  fallbackArea: keyof Score,
) {
  const cleaned = entries
    .filter((entry) => typeof entry.area === "string")
    .map((entry) => ({
      area: entry.area,
      score: clampScore(entry.score),
    }))
    .slice(0, 5);

  if (cleaned.length > 0) {
    return cleaned;
  }

  return [{ area: fallbackArea, score: 5 }];
}

function validateFixList(fixList: FixItem[]) {
  const cleaned = fixList
    .map((fix) => ({
      item: fix.item.trim(),
      specificObservation: fix.specificObservation.trim(),
      drill: fix.drill.trim(),
    }))
    .filter((fix) => fix.item && fix.specificObservation && fix.drill)
    .slice(0, 5);

  if (cleaned.length > 0) {
    return cleaned;
  }

  return [
    {
      item: "Rebuild ready stance",
      specificObservation: "The session needs one concrete correction to carry forward.",
      drill: "Repeat 10 slow reps focusing only on stance and recovery.",
    },
  ];
}

export function validateSessionSummary(summary: SessionSummary): SessionSummary {
  return {
    ...summary,
    sessionId: ensureString(summary.sessionId, "sessionId"),
    userId: ensureString(summary.userId, "userId"),
    sessionDate: ensureString(summary.sessionDate, "sessionDate"),
    durationSeconds: Math.max(0, Math.round(summary.durationSeconds)),
    compressedSummary: ensureString(summary.compressedSummary, "compressedSummary"),
    keyImprovement: ensureString(summary.keyImprovement, "keyImprovement"),
    memorableMoments: summary.memorableMoments
      .map((moment) => moment.trim())
      .filter(Boolean)
      .slice(0, 5),
    topScores: validateScoreEntries(summary.topScores, "technique"),
    weakAreas: validateScoreEntries(summary.weakAreas, "formAccuracy"),
    fixList: validateFixList(summary.fixList),
  };
}

export function validateProgressSnapshot(
  snapshot: ProgressSnapshot,
): ProgressSnapshot {
  return {
    ...snapshot,
    userId: ensureString(snapshot.userId, "progress.userId"),
    streak: Math.max(0, Math.round(snapshot.streak)),
    sessionsCompleted: Math.max(0, Math.round(snapshot.sessionsCompleted)),
    averageTopScore: Math.max(
      0,
      Math.min(10, Number(snapshot.averageTopScore.toFixed(1))),
    ),
    lastSessionDate: snapshot.lastSessionDate
      ? ensureString(snapshot.lastSessionDate, "progress.lastSessionDate")
      : null,
    latestImprovement: snapshot.latestImprovement?.trim() || null,
    currentFocus: snapshot.currentFocus?.trim() || null,
    trend: snapshot.trend,
  };
}
