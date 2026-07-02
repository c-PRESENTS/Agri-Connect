const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

type GeminiOptions = {
  systemInstruction?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: "text/plain" | "application/json";
};

function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.AI_INTEGRATIONS_GEMINI_API_KEY
  );
}

function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || "gemini-1.5-flash";
}

export function isGeminiAvailable(): boolean {
  return !!getGeminiApiKey();
}

function extractGeminiText(payload: any): string {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => part?.text).filter(Boolean).join("").trim();
}

export async function generateGeminiContent({
  systemInstruction,
  prompt,
  temperature = 0.3,
  maxOutputTokens = 300,
  responseMimeType = "text/plain",
}: GeminiOptions): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Gemini API key is not configured");

  const model = encodeURIComponent(getGeminiModelName());
  const response = await fetch(`${GEMINI_ENDPOINT}/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(systemInstruction
        ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
        : {}),
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType,
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Gemini request failed: ${response.status} ${message}`);
  }

  const payload = await response.json();
  const text = extractGeminiText(payload);
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}
