import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;
let db: Firestore | null = null;

function initApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return initializeApp({ credential: cert(serviceAccount) });
  }

  if (projectId) {
    return initializeApp({ projectId });
  }

  return initializeApp();
}

export function getFirestoreClient(): Firestore {
  if (db) {
    return db;
  }

  app = initApp();
  db = getFirestore(app);
  return db;
}

export function isFirestoreConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT ??
      process.env.FIREBASE_PROJECT_ID ??
      process.env.GCLOUD_PROJECT
  );
}
