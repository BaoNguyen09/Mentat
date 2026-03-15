import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

function readApiKey() {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;
}

function readVertexConfig() {
  const project =
    process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? null;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";

  if (!project) {
    return null;
  }

  return {
    project,
    location,
  };
}

export function shouldUseMockLiveBridge() {
  if (process.env.MENTAT_USE_MOCK_LIVE === "1") {
    return true;
  }

  return !readApiKey() && !readVertexConfig();
}

export function getLiveModel() {
  return (
    process.env.GEMINI_LIVE_MODEL ??
    "gemini-2.5-flash-native-audio-preview-12-2025"
  );
}

export function getGeminiClient() {
  if (geminiClient) {
    return geminiClient;
  }

  const apiKey = readApiKey();

  if (apiKey) {
    geminiClient = new GoogleGenAI({ apiKey });
    return geminiClient;
  }

  const vertexConfig = readVertexConfig();

  if (vertexConfig) {
    geminiClient = new GoogleGenAI({
      vertexai: true,
      project: vertexConfig.project,
      location: vertexConfig.location,
    });
    return geminiClient;
  }

  throw new Error(
    "Gemini Live credentials are missing. Set GEMINI_API_KEY, GOOGLE_API_KEY, or GOOGLE_CLOUD_PROJECT.",
  );
}
