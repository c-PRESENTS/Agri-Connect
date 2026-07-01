import type OpenAI from "openai";
import { isGeminiAvailable } from "./gemini";

// Language helpers shared across AI tasks
const SUPPORTED_LANGS = ["en", "hi", "pa", "ta", "cy", "pl"];

const LANG_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", pa: "Punjabi", ta: "Tamil", cy: "Welsh", pl: "Polish",
};

export function normalizeLang(lang: string): string {
  const base = lang.split("-")[0];
  return SUPPORTED_LANGS.includes(base) ? base : "en";
}

export function langDisplay(lang: string): string {
  return LANG_NAMES[lang] || lang;
}

export function createAIService(openai: OpenAI) {
  const geminiAvailable = isGeminiAvailable();
  if (geminiAvailable) {
    console.log("[ai] Gemini API key found — Gemini routing enabled (SDK stubbed, using OpenAI for now)");
  }

  return {
    /**
     * Translates text to the target language.
     * Gemini preferred if available, falls back to OpenAI.
     */
    translate: async (
      text: string,
      targetLanguage: string,
      context: string,
    ): Promise<string> => {
      const lang = normalizeLang(targetLanguage);
      const langName = langDisplay(lang);

      // Gemini path — ready when SDK is installed
      if (geminiAvailable) {
        // TODO: call GoogleGenAI model.generateContent()
        // const model = getGeminiModel();
        // const result = await model.generateContent(...)
        // return result.text;
      }

      // OpenAI fallback
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Translate the following text to ${langName}. Return only the translated text, no explanations.\nContext: ${context}\nText: ${text}`,
        }],
        max_tokens: 300,
        temperature: 0.2,
      });

      return completion.choices[0]?.message?.content?.trim() || text;
    },

    /**
     * Interprets a voice transcript and returns the parsed action/response.
     * Gemini preferred if available, falls back to OpenAI.
     */
    interpretVoice: async (
      transcript: string,
      language: string,
      context: string,
    ): Promise<Record<string, unknown>> => {
      // Gemini path — ready when SDK is installed
      if (geminiAvailable) {
        // TODO: call GoogleGenAI model.generateContent()
        // const model = getGeminiModel();
        // const result = await model.generateContent(...)
        // return JSON.parse(result.text);
      }

      // OpenAI fallback
      const systemPrompt = `You are the AgriConnect voice assistant for a UK agricultural marketplace.
      
The user spoke: "${transcript}" (language: ${language})

Your job is to interpret the command and return a JSON response with:
- "response": a short, friendly spoken reply in the same language as the user (max 20 words)
- "action": one of "search", "navigate", "info", or "search_text"  
- "query": if action is "search", the search term to use
- "path": if action is "navigate", the URL path (e.g. "/dashboard", "/cart", "/land-leasing", "/share-care", "/logistics", "/farmers-help")

Examples:
- "show me organic potatoes" → {"response": "Searching for organic potatoes now", "action": "search", "query": "organic potatoes"}
- "go to my dashboard" → {"response": "Opening your dashboard", "action": "navigate", "path": "/dashboard"}
- "what vegetables are available" → {"response": "Searching vegetables for you", "action": "search", "query": "vegetables"}
- "open the cart" → {"response": "Opening your cart", "action": "navigate", "path": "/cart"}

Respond only with valid JSON.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: systemPrompt }],
        max_tokens: 150,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content || "{}";
      return JSON.parse(content) as Record<string, unknown>;
    },
  };
}
