import type OpenAI from "openai";
import { generateGeminiContent, isGeminiAvailable } from "./gemini";

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

function isOpenAIAvailable(): boolean {
  return !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
}

export function createAIService(openai: OpenAI) {
  const geminiAvailable = isGeminiAvailable();
  if (geminiAvailable) {
    console.log("[ai] Gemini API key found — Gemini routing enabled");
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

      if (geminiAvailable) {
        try {
          return await generateGeminiContent({
            systemInstruction: `You are a translation engine for AgriConnect. Return only the translated text.`,
            prompt: `Translate the following text to ${langName}.\nContext: ${context}\nText: ${text}`,
            temperature: 0.2,
            maxOutputTokens: 300,
          });
        } catch (error) {
          console.warn("[ai] Gemini translation failed; falling back to OpenAI", error);
        }
      }

      if (!isOpenAIAvailable()) {
        throw new Error("AI translation provider is not configured");
      }

      // OpenAI secondary provider
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: `Translate the following text to ${langName}. Return only the translated text, no explanations.\nContext: ${context}\nText: ${text}`,
          }],
          max_tokens: 300,
          temperature: 0.2,
        });

        const translated = completion.choices[0]?.message?.content?.trim();
        if (!translated) throw new Error("OpenAI returned an empty translation");
        return translated;
      } catch (error) {
        console.warn("[ai] OpenAI translation failed", error);
        throw error;
      }
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
      if (geminiAvailable) {
        try {
          const content = await generateGeminiContent({
            systemInstruction: "Return only valid JSON. Do not wrap it in markdown.",
            prompt: buildVoicePrompt(transcript, language, context),
            temperature: 0.25,
            maxOutputTokens: 180,
            responseMimeType: "application/json",
          });
          return JSON.parse(content) as Record<string, unknown>;
        } catch (error) {
          console.warn("[ai] Gemini voice interpretation failed; falling back to OpenAI", error);
        }
      }

      if (!isOpenAIAvailable()) {
        throw new Error("AI voice provider is not configured");
      }

      const systemPrompt = buildVoicePrompt(transcript, language, context);

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

function buildVoicePrompt(transcript: string, language: string, context: string): string {
  return `You are the AgriConnect voice assistant for an agricultural marketplace.

The user spoke: "${transcript}" (language: ${language})
Context: ${context}

Interpret the command and return a JSON response with:
- "response": a short, friendly spoken reply in the same language as the user (max 20 words)
- "action": one of "search", "navigate", "info", or "search_text"
- "query": if action is "search", the search term to use
- "path": if action is "navigate", the URL path (e.g. "/dashboard", "/cart", "/land-leasing", "/share-care", "/logistics", "/farmers-help")

Examples:
- "show me organic potatoes" -> {"response": "Searching for organic potatoes now", "action": "search", "query": "organic potatoes"}
- "go to my dashboard" -> {"response": "Opening your dashboard", "action": "navigate", "path": "/dashboard"}
- "what vegetables are available" -> {"response": "Searching vegetables for you", "action": "search", "query": "vegetables"}
- "open the cart" -> {"response": "Opening your cart", "action": "navigate", "path": "/cart"}

Respond only with valid JSON.`;
}
