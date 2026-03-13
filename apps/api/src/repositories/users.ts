import type { Domain, Profile, ProgressSnapshot } from "@mentat/types";
import { getFirestoreClient, isFirestoreConfigured } from "../lib/firestore";

const PROFILES_COLLECTION = "profiles";
const PROGRESS_COLLECTION = "progress";

const defaultProfile = (userId: string): Profile => ({
  userId,
  name: "Alex",
  domains: ["table-tennis"],
  streak: 0,
  createdAt: new Date().toISOString(),
});

const defaultProgress = (userId: string, domain: Domain): ProgressSnapshot => ({
  userId,
  domain,
  streak: 0,
  sessionsCompleted: 0,
});

export async function getUserProfile(userId: string): Promise<Profile> {
  if (!isFirestoreConfigured()) {
    return defaultProfile(userId);
  }

  const db = getFirestoreClient();
  const doc = await db.collection(PROFILES_COLLECTION).doc(userId).get();
  return doc.exists ? (doc.data() as Profile) : defaultProfile(userId);
}

export async function getProgressSnapshot(
  userId: string,
  domain: Domain
): Promise<ProgressSnapshot> {
  if (!isFirestoreConfigured()) {
    return defaultProgress(userId, domain);
  }

  const db = getFirestoreClient();
  const docId = `${userId}_${domain}`;
  const doc = await db.collection(PROGRESS_COLLECTION).doc(docId).get();
  return doc.exists ? (doc.data() as ProgressSnapshot) : defaultProgress(userId, domain);
}

export async function updateUserProgress(
  userId: string,
  domain: Domain
): Promise<ProgressSnapshot> {
  if (!isFirestoreConfigured()) {
    const progress = defaultProgress(userId, domain);
    progress.sessionsCompleted += 1;
    progress.streak += 1;
    return progress;
  }

  const db = getFirestoreClient();
  const docId = `${userId}_${domain}`;
  const ref = db.collection(PROGRESS_COLLECTION).doc(docId);
  const doc = await ref.get();

  const current = doc.exists
    ? (doc.data() as ProgressSnapshot)
    : defaultProgress(userId, domain);

  const updated: ProgressSnapshot = {
    ...current,
    sessionsCompleted: current.sessionsCompleted + 1,
    streak: current.streak + 1,
  };

  await ref.set(updated);
  return updated;
}
