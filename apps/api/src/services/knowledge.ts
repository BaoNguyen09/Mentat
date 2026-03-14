import type {
  DomainKnowledgeEntry,
  TrackKnowledgeEntryRequest,
} from "@mentat/types";

function makeEntryId() {
  return `knowledge-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function splitIntoSentences(transcript: string) {
  return transcript
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function buildSummary(sentences: string[]) {
  const summary = sentences[0] ?? "Captured a new Mentat knowledge entry.";
  return summary.length > 220 ? `${summary.slice(0, 217)}...` : summary;
}

function buildKeyPoints(sentences: string[]) {
  return sentences
    .filter((sentence) => sentence.length > 24)
    .slice(0, 3);
}

function detectNextAction(sentences: string[]) {
  const nextActionSentence = sentences.find((sentence) =>
    /(i need to|next i should|tomorrow i will|the next step|i should)/iu.test(
      sentence,
    ),
  );

  return nextActionSentence ?? null;
}

export function createKnowledgeEntry(
  input: TrackKnowledgeEntryRequest,
): DomainKnowledgeEntry {
  const normalizedTranscript = input.transcript.trim();
  const sentences = splitIntoSentences(normalizedTranscript);

  return {
    entryId: makeEntryId(),
    userId: input.userId.trim(),
    domainGroup: input.domainGroup.trim(),
    subdomain: input.subdomain.trim(),
    source: input.source,
    transcript: normalizedTranscript,
    summary: buildSummary(sentences),
    keyPoints: buildKeyPoints(sentences),
    nextAction: detectNextAction(sentences),
    createdAt: new Date().toISOString(),
  };
}
