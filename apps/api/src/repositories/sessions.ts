import type { SessionSummary } from "@mentat/types";

import { getFirestoreClient, isFirestoreConfigured } from "../lib/firestore.js";
import { validateSessionSummary } from "../lib/validators.js";
import { readLocalStore, updateLocalStore } from "./local-store.js";

const COLLECTION = "sessions";

export async function saveSessionRecord(summary: SessionSummary): Promise<void> {
  const validated = validateSessionSummary(summary);

  if (!isFirestoreConfigured()) {
    await updateLocalStore((store) => {
      store.sessions = store.sessions.filter(
        (entry) => entry.sessionId !== validated.sessionId,
      );
      store.sessions.push(validated);
    });
    return;
  }

  const db = getFirestoreClient();
  await db.collection(COLLECTION).doc(validated.sessionId).set(validated);
}

export async function getRecentSessionSummaries(
  userId: string,
  limit = 5,
): Promise<SessionSummary[]> {
  if (!isFirestoreConfigured()) {
    const store = await readLocalStore();
    return store.sessions
      .filter((session) => session.userId === userId)
      .sort((left, right) => right.sessionDate.localeCompare(left.sessionDate))
      .slice(0, limit);
  }

  const db = getFirestoreClient();
  const snap = await db
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .orderBy("sessionDate", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => validateSessionSummary(doc.data() as SessionSummary));
}

export async function getAllSessionSummaries(
  userId: string,
): Promise<SessionSummary[]> {
  return getRecentSessionSummaries(userId, 500);
}
