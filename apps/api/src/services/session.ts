import type { Domain, FinalizeSessionResponse, Personality } from "@mentat/types";
import { saveSessionRecord } from "../repositories/sessions";
import { updateUserProgress } from "../repositories/users";
import { generateSessionSummary } from "./summary";
import { generateFixList } from "./plan";

export interface FinalizeSessionInput {
  sessionId: string;
  userId: string;
  domain: Domain;
  personality: Personality;
  durationSeconds: number;
  coachTranscript: string[];
}

export async function finalizeSession(
  input: FinalizeSessionInput
): Promise<FinalizeSessionResponse> {
  const summary = await generateSessionSummary({
    sessionId: input.sessionId,
    userId: input.userId,
    domain: input.domain,
    personality: input.personality,
    durationSeconds: input.durationSeconds,
    coachTranscript: input.coachTranscript,
  });

  const refinedFixList = await generateFixList(summary);
  summary.fixList = refinedFixList;

  await saveSessionRecord(summary);
  await updateUserProgress(input.userId, input.domain);

  return {
    summary,
    status: "complete",
  };
}
