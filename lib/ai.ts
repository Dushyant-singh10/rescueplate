import { createGoogleGenerativeAI } from "@ai-sdk/google";

// .env.example documents GEMINI_API_KEY (not the SDK's default
// GOOGLE_GENERATIVE_AI_API_KEY), so pass it through explicitly.
const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export const MODEL_ID = "gemini-2.5-flash";

export const aiModel = google(MODEL_ID);
