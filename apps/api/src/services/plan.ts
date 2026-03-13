import type { FixItem, SessionSummary } from "@mentat/types";
import { getGeminiClient } from "../lib/gemini";

const FIX_MODEL = "gemini-2.0-flash";

const FIX_PROMPT = `You are generating a prioritized fix list for an athlete based on their session summary.
Given the session summary below, return a JSON array of fix items:

[{ "item": "<what to fix>", "specificObservation": "<what was observed>", "drill": "<specific drill to practice>" }]

Limit to 3-5 items, ordered by impact. Be specific and actionable.
Return ONLY valid JSON, no markdown fences.`;

export async function generateFixList(
  summary: SessionSummary
): Promise<FixItem[]> {
  try {
    const client = getGeminiClient();

    const userMessage = `Domain: ${summary.domain}
Weak areas: ${summary.weakAreas.map((w) => `${w.area}: ${w.score}/10`).join(", ")}
Memorable moments: ${summary.memorableMoments.join("; ")}
Key improvement: ${summary.keyImprovement}`;

    const result = await client.models.generateContent({
      model: FIX_MODEL,
      contents: userMessage,
      config: {
        systemInstruction: FIX_PROMPT,
        temperature: 0.3,
      },
    });

    const text = result.text?.trim() ?? "";
    return JSON.parse(text) as FixItem[];
  } catch {
    return summary.fixList;
  }
}
