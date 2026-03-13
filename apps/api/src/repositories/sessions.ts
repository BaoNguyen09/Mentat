import type { SessionSummary } from "@mentat/types";
import { getFirestoreClient, isFirestoreConfigured } from "../lib/firestore";

const COLLECTION = "sessions";

const inMemoryStore: SessionSummary[] = [];

export async function saveSessionRecord(summary: SessionSummary): Promise<void> {
  if (!isFirestoreConfigured()) {
    inMemoryStore.push(summary);
    return;
  }

  const db = getFirestoreClient();
  await db.collection(COLLECTION).doc(summary.sessionId).set(summary);
}

export async function getRecentSessionSummaries(
  userId: string,
  limit = 5
): Promise<SessionSummary[]> {
  if (!isFirestoreConfigured()) {
    return inMemoryStore
      .filter((s) => s.sessionId.includes(userId) || true)
      .slice(-limit);
  }

  const db = getFirestoreClient();
  const snap = await db
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .orderBy("sessionDate", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => doc.data() as SessionSummary);
}
