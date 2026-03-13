import type { Profile, ProgressSnapshot, SessionSummary } from "@mentat/types";
import { isFirestoreConfigured, getFirestoreClient } from "./lib/firestore";
import { loadEnvironment } from "./lib/env";
import { saveSessionRecord } from "./repositories/sessions";

loadEnvironment();

const ALEX_PROFILE: Profile = {
  userId: "alex-demo",
  name: "Alex",
  domains: ["table-tennis"],
  streak: 3,
  createdAt: "2026-03-01T00:00:00Z",
};

const ALEX_PROGRESS: ProgressSnapshot = {
  userId: "alex-demo",
  domain: "table-tennis",
  streak: 3,
  sessionsCompleted: 7,
};

const SEED_SESSIONS: SessionSummary[] = [
  {
    sessionId: "seed-001",
    sessionDate: "2026-03-07T10:00:00Z",
    domain: "table-tennis",
    personality: "sensei",
    durationSeconds: 360,
    topScores: [
      { area: "engagement", score: 9 },
      { area: "technique", score: 7 },
    ],
    weakAreas: [
      { area: "formAccuracy", score: 4 },
      { area: "consistency", score: 5 },
    ],
    memorableMoments: [
      "First successful topspin rally",
      "Good footwork in final set",
    ],
    fixList: [
      {
        item: "Paddle angle on forehand",
        specificObservation: "Face too open causing pop-ups",
        drill: "Shadow swing 20 reps with closed face focus",
      },
      {
        item: "Recovery stance",
        specificObservation: "Flat-footed after serve return",
        drill: "Bounce on balls of feet between rallies",
      },
    ],
    keyImprovement: "Started rotating shoulders into forehand",
  },
  {
    sessionId: "seed-002",
    sessionDate: "2026-03-09T14:00:00Z",
    domain: "table-tennis",
    personality: "hype",
    durationSeconds: 420,
    topScores: [
      { area: "technique", score: 8 },
      { area: "improvement", score: 8 },
    ],
    weakAreas: [
      { area: "formAccuracy", score: 5 },
      { area: "consistency", score: 6 },
    ],
    memorableMoments: [
      "Backhand block consistency improved",
      "Three consecutive clean returns",
    ],
    fixList: [
      {
        item: "Elbow drift on backhand",
        specificObservation: "Elbow flares out losing control",
        drill: "Tuck towel under arm and practice blocks",
      },
      {
        item: "Serve toss consistency",
        specificObservation: "Toss height varies by 6 inches",
        drill: "50 serve tosses to consistent height marker",
      },
    ],
    keyImprovement: "Footwork recovery time cut by 0.5s",
  },
  {
    sessionId: "seed-003",
    sessionDate: "2026-03-11T09:30:00Z",
    domain: "table-tennis",
    personality: "drill_sergeant",
    durationSeconds: 300,
    topScores: [
      { area: "engagement", score: 9 },
      { area: "consistency", score: 7 },
    ],
    weakAreas: [
      { area: "formAccuracy", score: 6 },
      { area: "technique", score: 6 },
    ],
    memorableMoments: [
      "Held ready stance for entire rally",
      "Closed paddle face on 8 of 10 forehands",
    ],
    fixList: [
      {
        item: "Follow-through direction",
        specificObservation: "Arm stops short after contact",
        drill: "Exaggerate follow-through to opposite shoulder 15 reps",
      },
    ],
    keyImprovement: "Paddle angle control improved significantly from session 1",
  },
];

async function seed() {
  console.log("Seeding Alex demo user...");

  if (isFirestoreConfigured()) {
    const db = getFirestoreClient();
    await db.collection("profiles").doc("alex-demo").set(ALEX_PROFILE);
    await db
      .collection("progress")
      .doc("alex-demo_table-tennis")
      .set(ALEX_PROGRESS);
    console.log("Firestore: profile and progress written.");
  } else {
    console.log("Firestore not configured — seeding in-memory store only.");
  }

  for (const session of SEED_SESSIONS) {
    await saveSessionRecord(session);
    console.log(`Saved session ${session.sessionId}`);
  }

  console.log("Seed complete.");
}

seed().catch(console.error);
