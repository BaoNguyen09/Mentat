import type { Domain, Personality, Score, SessionSummary } from "@mentat/types";
import { getGeminiClient } from "../lib/gemini";

const SUMMARY_MODEL = "gemini-2.0-flash";

const SUMMARY_PROMPT = `You are analyzing a coaching session to produce a structured summary.
Given the session metadata below, generate a JSON object with these exact fields:

{
  "topScores": [{ "area": "<keyof Score>", "score": <1-10> }, ...],
  "weakAreas": [{ "area": "<keyof Score>", "score": <1-10> }, ...],
  "memorableMoments": ["<string>", ...],
  "fixList": [{ "item": "<what to fix>", "specificObservation": "<what you saw>", "drill": "<how to practice>" }, ...],
  "keyImprovement": "<one sentence about the biggest improvement>"
}

Score areas are: formAccuracy, consistency, technique, improvement, engagement.
Return ONLY valid JSON, no markdown fences.`;

interface GenerateSummaryInput {
  sessionId: string;
  userId: string;
  domain: Domain;
  personality: Personality;
  durationSeconds: number;
  coachTranscript: string[];
}

function buildFallbackSummary(input: GenerateSummaryInput): SessionSummary {
  return {
    sessionId: input.sessionId,
    sessionDate: new Date().toISOString(),
    domain: input.domain,
    personality: input.personality,
    durationSeconds: input.durationSeconds,
    topScores: [
      { area: "engagement", score: 8 },
      { area: "technique", score: 7 },
    ],
    weakAreas: [
      { area: "formAccuracy", score: 5 },
      { area: "consistency", score: 6 },
    ],
    memorableMoments: ["Session completed successfully"],
    fixList: [
      {
        item: "General form",
        specificObservation: "Review session recording for specific corrections",
        drill: "Practice fundamental drills for 10 minutes",
      },
    ],
    keyImprovement: "Completed a full coaching session",
  };
}

export async function generateSessionSummary(
  input: GenerateSummaryInput
): Promise<SessionSummary> {
  try {
    const client = getGeminiClient();

    const userMessage = `Session: ${input.domain}, personality: ${input.personality}, duration: ${input.durationSeconds}s.
Coach transcript highlights:
${input.coachTranscript.slice(-20).join("\n")}`;

    const result = await client.models.generateContent({
      model: SUMMARY_MODEL,
      contents: userMessage,
      config: {
        systemInstruction: SUMMARY_PROMPT,
        temperature: 0.3,
      },
    });

    const text = result.text?.trim() ?? "";
    const parsed = JSON.parse(text);

    return {
      sessionId: input.sessionId,
      sessionDate: new Date().toISOString(),
      domain: input.domain,
      personality: input.personality,
      durationSeconds: input.durationSeconds,
      topScores: parsed.topScores ?? [],
      weakAreas: parsed.weakAreas ?? [],
      memorableMoments: parsed.memorableMoments ?? [],
      fixList: parsed.fixList ?? [],
      keyImprovement: parsed.keyImprovement ?? "Session completed",
    };
  } catch {
    return buildFallbackSummary(input);
  }
}
