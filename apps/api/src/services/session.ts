import type { Domain, FinalizeSessionResponse, Personality } from "@mentat/types";

import { validateSessionSummary } from "../lib/validators";
import { saveSessionRecord } from "../repositories/sessions";
import { updateUserProgress } from "../repositories/users";
import { generateFixList } from "./plan";
import { generateSessionSummary } from "./summary";

export interface FinalizeSessionInput {
  sessionId: string;
  userId: string;
  domain: Domain;
  personality: Personality;
  durationSeconds: number;
  coachTranscript: string[];
}

export type FinalizePipelineStep =
  | "generate-summary"
  | "generate-fix-list"
  | "validate-summary"
  | "persist-session"
  | "refresh-progress";

interface FinalizeSessionOptions {
  onStep?: (step: FinalizePipelineStep) => Promise<void> | void;
}

export async function finalizeSession(
  input: FinalizeSessionInput,
  options: FinalizeSessionOptions = {},
): Promise<FinalizeSessionResponse> {
  await options.onStep?.("generate-summary");
  const generatedSummary = await generateSessionSummary({
    sessionId: input.sessionId,
    userId: input.userId,
    domain: input.domain,
    personality: input.personality,
    durationSeconds: input.durationSeconds,
    coachTranscript: input.coachTranscript,
  });

  await options.onStep?.("generate-fix-list");
  generatedSummary.fixList = await generateFixList(generatedSummary);

  await options.onStep?.("validate-summary");
  const summary = validateSessionSummary(generatedSummary);

  await options.onStep?.("persist-session");
  await saveSessionRecord(summary);

  await options.onStep?.("refresh-progress");
  await updateUserProgress(input.userId, input.domain);

  return {
    summary,
    status: "complete",
  };
}
