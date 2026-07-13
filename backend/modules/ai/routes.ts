import type { Express, NextFunction, Request, Response } from "express";
import OpenAI from "openai";
import { isAuthenticated } from "../../auth";
import { createAIService, normalizeLang } from "../../ai";
import { generateGeminiContent, isGeminiAvailable } from "../../ai/gemini";
import { storage } from "../../storage";

interface AIRouteDeps {
  aiRateLimit(limit: number, windowMs: number): (req: Request, res: Response, next: NextFunction) => void;
}


const openAiApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

const openai = openAiApiKey
  ? new OpenAI({
      apiKey: openAiApiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    })
  : undefined;

const ai = createAIService(openai);

const SEARCH_SYNONYMS: Record<string, string[]> = {
  veggie: ["vegetable", "vegetables"],
  veggies: ["vegetable", "vegetables"],
  veg: ["vegetable", "vegetables"],
  taters: ["potato", "potatoes"],
  aloo: ["potato", "potatoes"],
  doodh: ["milk", "dairy"],
  atta: ["flour", "wheat"],
  pyaz: ["onion", "onions"],
  tamatar: ["tomato", "tomatoes"],
  organic: ["organic", "natural"],
  fruit: ["fruit", "fruits"],
};

function parseJsonObject(raw: string): Record<string, any> {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(cleaned || "{}") as Record<string, any>;
}

function inferSearchExpansion(query: string): { expandedQuery: string; category: string | null; intent: "search" | "browse" } {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = new Set(words);
  for (const word of words) {
    SEARCH_SYNONYMS[word]?.forEach((term) => expanded.add(term));
  }

  const joined = Array.from(expanded).join(" ");
  let category: string | null = null;
  if (/\b(seed|fertili[sz]er|tool|tractor|glove|pesticide|feed)\b/.test(joined)) category = "inputs-tools";
  else if (/\b(milk|dairy|egg|vegetable|fruit|grain|rice|wheat|tomato|potato|onion|apple|carrot)\b/.test(joined)) category = "daily-needs";
  else if (/\b(jam|pickle|oil|flour|snack|bread|processed)\b/.test(joined)) category = "processed";
  else if (/\b(hydroponic|greenhouse|sensor|drone|smart|agritech)\b/.test(joined)) category = "modern-farming";
  else if (/\b(transport|service|irrigation|advisory|logistics)\b/.test(joined)) category = "services";

  const intent: "search" | "browse" = /\b(show|browse|list|all|available|category|categories)\b/.test(joined) ? "browse" : "search";
  return { expandedQuery: joined || query, category, intent };
}

export function registerAIRoutes(app: Express, deps: AIRouteDeps): void {
  const { aiRateLimit } = deps;
  // AI Chat Assistant — auth-gated and rate-limited to bound OpenAI cost
  app.post("/api/chat", isAuthenticated, aiRateLimit(20, 60_000), async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }
      if (message.length > 1000) {
        return res.status(400).json({ error: "Message too long (max 1000 characters)" });
      }
      if (!openai) {
        return res.status(503).json({
          error: "AI chat provider is not configured or unavailable",
          code: "AI_CHAT_UNAVAILABLE",
        });
      }

      const products = await storage.getProducts({});
      const categories = await storage.getCategories();
      
      const productSummary = products.slice(0, 20).map(p => 
        `${p.name}: £${p.price}/${p.unit} from ${p.farmerName} (${p.farmerLocation})`
      ).join("\n");

      const categorySummary = categories.map(c => 
        `${c.name}: ${c.subcategories.map(s => s.name).join(", ")}`
      ).join("\n");

      const systemPrompt = `You are AgriConnect Assistant, a helpful AI for the AgriConnect agricultural marketplace platform.

AgriConnect connects farmers directly with buyers in the UK. Here's what you know:

PLATFORM FEATURES:
- Direct farmer-to-buyer marketplace
- 200+ product categories (vegetables, fruits, grains, dairy, etc.)
- Real-time map showing farmer locations
- Photo-sell feature for farmers to list products instantly
- Voice command support
- Government farming schemes information
- Multi-currency support (default: GBP £)

CURRENT PRODUCTS (sample):
${productSummary}

CATEGORIES:
${categorySummary}

GUIDELINES:
- Be friendly, helpful, and conversational
- Provide specific product recommendations when asked
- Help farmers understand how to list products
- Explain platform features clearly
- Suggest seasonal produce and farming tips
- Keep responses concise but informative
- Use £ (GBP) for prices as this is a UK platform`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map((msg: { role: string; content: string }) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user", content: message },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
      
      res.json({ reply });
    } catch (error) {
      console.error("AI Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // D.3 / D.7 Real-time translation endpoint
  app.post("/api/ai/translate", aiRateLimit(120, 60_000), async (req, res) => {
    try {
      const { text, targetLanguage = "en", context = "agricultural marketplace" } = req.body;

      if (!text || typeof text !== "string") return res.status(400).json({ error: "Text is required" });
      if (text.length > 2000) return res.status(400).json({ error: "Text too long (max 2000 characters)" });

      const lang = normalizeLang(targetLanguage);
      if (lang === "en" && targetLanguage !== "en") return res.status(400).json({ error: "Unsupported language" });

      const translated = await ai.translate(text, lang, context);
      res.json({ translated, targetLanguage: lang, original: text });
    } catch (error) {
      console.error("Translation error:", error);
      const text = typeof req.body?.text === "string" ? req.body.text : "";
      const lang = normalizeLang(req.body?.targetLanguage || "en");
      res.status(503).json({
        error: "AI translation provider is not configured or unavailable",
        code: "AI_TRANSLATION_UNAVAILABLE",
        targetLanguage: lang,
        original: text,
      });
    }
  });

  // AI Voice Command — interprets voice transcript, supports multi-turn conversation
  app.post("/api/ai/voice", aiRateLimit(15, 60_000), async (req, res) => {
    try {
      const { transcript, language = "en", context = "", conversationHistory = [] } = req.body;

      if (!transcript || typeof transcript !== "string") {
        return res.status(400).json({ error: "Transcript is required" });
      }
      if (transcript.length > 500) {
        return res.status(400).json({ error: "Transcript too long (max 500 characters)" });
      }

      const lang = normalizeLang(language);

      // Build conversation context for multi-turn
      const historySnippet = conversationHistory.length > 0
        ? "\n\nPrevious conversation:\n" + conversationHistory.map((turn: { role: string; text: string }) =>
            `${turn.role === "user" ? "User" : "Assistant"}: ${turn.text}`
          ).join("\n")
        : "";

      const parsed = await ai.interpretVoice(transcript, lang, `${context}${historySnippet}`);
      res.json(parsed);
    } catch (error) {
      console.error("Voice AI error:", error);
      res.status(503).json({
        error: "AI voice provider is not configured or unavailable",
        code: "AI_VOICE_UNAVAILABLE",
      });
    }
  });

  // AI-Powered Search — expands query with synonyms, handles typos, returns enhanced results
  app.post("/api/ai/search", aiRateLimit(30, 60_000), async (req, res) => {
    try {
      const { query, language = "en" } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }
      if (query.length > 200) {
        return res.status(400).json({ error: "Query too long (max 200 characters)" });
      }

      const lang = normalizeLang(language);
      const langName = lang === "en" ? "English" : lang === "hi" ? "Hindi" : lang === "pa" ? "Punjabi" : lang === "ta" ? "Tamil" : lang === "cy" ? "Welsh" : "Polish";

      // Step 1: Get all products for context
      const allProducts = await storage.getProducts({});
      const productNames = allProducts.map(p => p.name).slice(0, 100);

      // Step 2: Use AI to expand the search query
      const systemPrompt = `You are a search engine for an agricultural marketplace called AgriConnect.

The user searched for: "${query}" (language: ${langName})

Available product names (sample): ${productNames.join(", ")}

Your job is to:
1. Correct any typos or misspellings
2. Expand the query with synonyms and related agricultural terms (e.g. "veggies" → "vegetables", "taters" → "potatoes")
3. If the query is in a non-English language, also provide the English equivalent
4. Return a JSON object with:
   - "expandedQuery": the corrected/expanded English search terms (space-separated keywords)
   - "category": best matching category hint if obvious (one of: "daily-needs", "inputs-tools", "processed", "specialty", "other-agri", "supermarket", "dietary", "modern-farming", "services", "commercial-crops", "bio-products", or null)
   - "intent": "search" or "browse" (is the user looking for a specific product or browsing a category?)

Respond only with valid JSON, no markdown.`;

      const inferred = inferSearchExpansion(query);
      let expandedQuery = inferred.expandedQuery;
      let categoryHint: string | null = inferred.category;
      let intent: "search" | "browse" = inferred.intent;

      try {
        let raw = "";
        if (isGeminiAvailable()) {
          raw = await generateGeminiContent({
            systemInstruction: "Return only valid JSON. Do not wrap it in markdown.",
            prompt: systemPrompt,
            temperature: 0.2,
            maxOutputTokens: 150,
            responseMimeType: "application/json",
          });
        } else if (openai) {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: systemPrompt }],
            max_tokens: 150,
            temperature: 0.2,
            response_format: { type: "json_object" },
          });
          raw = completion.choices[0]?.message?.content || "{}";
        }

        const aiResult = raw ? parseJsonObject(raw) : {};
        expandedQuery = aiResult.expandedQuery || query;
        categoryHint = aiResult.category || categoryHint;
        intent = aiResult.intent === "browse" ? "browse" : "search";
      } catch {
        expandedQuery = inferred.expandedQuery;
      }

      // Step 3: Search with expanded query using multiple strategies
      const keywords = expandedQuery.toLowerCase().split(/\s+/).filter(Boolean);

      // Primary: exact match on expanded terms
      let results = allProducts.filter(p => {
        const haystack = `${p.name} ${p.description} ${p.farmerName}`.toLowerCase();
        return keywords.some(kw => haystack.includes(kw));
      });

      // Fuzzy: Levenshtein-based matching for typos
      if (results.length < 3) {
        const levenshtein = (a: string, b: string): number => {
          const m = a.length, n = b.length;
          const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
          for (let i = 0; i <= m; i++) dp[i][0] = i;
          for (let j = 0; j <= n; j++) dp[0][j] = j;
          for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
              dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
              );
            }
          }
          return dp[m][n];
        };

        const fuzzyResults = allProducts.filter(p => {
          const nameLower = p.name.toLowerCase();
          return keywords.some(kw => {
            if (nameLower.includes(kw)) return true;
            // Allow up to 2 character edits for words >= 4 chars
            const words = nameLower.split(/\s+/);
            return words.some(w => w.length >= 4 && levenshtein(w, kw) <= 2);
          });
        });

        // Merge without duplicates
        const existingIds = new Set(results.map(p => p.id));
        fuzzyResults.forEach(p => { if (!existingIds.has(p.id)) results.push(p); });
      }

      // Category filter if AI suggested one
      if (categoryHint && intent === "browse") {
        const categoryMatches = results.filter(p => p.categoryId === categoryHint);
        if (categoryMatches.length > 0) results = categoryMatches;
      }

      // Sort: name match first, then rating
      results.sort((a, b) => {
        const aNameMatch = keywords.some(kw => a.name.toLowerCase().includes(kw));
        const bNameMatch = keywords.some(kw => b.name.toLowerCase().includes(kw));
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return b.rating - a.rating;
      });

      res.json({
        results: results.slice(0, 20),
        expandedQuery,
        categoryHint,
        intent,
        totalFound: results.length,
      });
    } catch (error) {
      console.error("AI Search error:", error);
      // Fallback: plain search
      try {
        const products = await storage.getProducts({ search: req.body.query });
        res.json({ results: products, expandedQuery: req.body.query, categoryHint: null, intent: "search", totalFound: products.length });
      } catch {
        res.status(500).json({ error: "Search failed" });
      }
    }
  });
}
