export interface FinalizeSessionInput {
  sessionId: string;
  userId: string;
}

export async function finalizeSession(input: FinalizeSessionInput) {
  return {
    step: "scaffolded",
    input,
  };
}
