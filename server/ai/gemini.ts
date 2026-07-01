/**
 * Gemini AI integration placeholder.
 *
 * To activate, add GEMINI_API_KEY to your .env and install the SDK:
 *   pnpm add @google/generative-ai
 *
 * When configured, this module exports a client factory. Otherwise
 * the unified AI service (./index.ts) falls back to OpenAI.
 */

export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function getGeminiModel() {
  if (!isGeminiAvailable()) return null;
  // TODO: When @google/generative-ai is installed, initialise:
  //
  //   const { GoogleGenAI } = require("@google/generative-ai");
  //   const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  //   return client.models.get("gemini-2.0-flash");
  //
  console.log("[gemini] SDK not yet installed — falling through to OpenAI");
  return null;
}
