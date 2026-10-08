import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import crypto from "crypto";

export type AiErrorCode =
  | "rate_limited"
  | "timeout"
  | "invalid_output"
  | "unsafe_input"
  | "unavailable";

export interface GenerateJsonOptions<T> {
  system: string;
  parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  >;
  zod: z.ZodSchema<T>;
  cacheKey?: string;
  temperature?: number;
}

export type AiResult<T> =
  | { ok: true; data: T; cached?: boolean; latencyMs: number }
  | { ok: false; code: AiErrorCode; message: string; latencyMs: number };

// In-memory cache for demo runtime (hash -> { data, timestamp })
const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

// In-memory token bucket rate limiter (IP -> { tokens, lastRefill })
const ipRateBuckets = new Map<string, { tokens: number; lastRefill: number }>();
const MAX_TOKENS = 20; // 20 requests
const REFILL_RATE_PER_SEC = 2; // 2 tokens per second

export function checkRateLimit(ip: string = "anonymous"): boolean {
  const now = Date.now();
  let bucket = ipRateBuckets.get(ip);

  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    ipRateBuckets.set(ip, bucket);
  } else {
    const elapsedSec = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + elapsedSec * REFILL_RATE_PER_SEC);
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

export function computeCacheHash(prefix: string, content: unknown): string {
  const raw = typeof content === "string" ? content : JSON.stringify(content);
  return `${prefix}:${crypto.createHash("sha256").update(raw).digest("hex")}`;
}

/**
 * Core server-side Gemini Flash wrapper with Zod validation, timeouts, retries, and caching.
 */
export async function generateJson<T>(
  options: GenerateJsonOptions<T>
): Promise<AiResult<T>> {
  const startTime = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      code: "unavailable",
      message: "GEMINI_API_KEY is not configured in the server environment.",
      latencyMs: Date.now() - startTime,
    };
  }

  // 1. Check cache
  if (options.cacheKey) {
    const cached = responseCache.get(options.cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        ok: true,
        data: cached.data as T,
        cached: true,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 15000;
  const genAI = new GoogleGenAI({ apiKey });

  // Format contents for @google/genai SDK
  const formattedParts: any[] = options.parts.map((p) => {
    if ("text" in p) {
      return { text: p.text };
    }
    return {
      inlineData: {
        mimeType: p.inlineData.mimeType,
        data: p.inlineData.data,
      },
    };
  });

  const runWithTimeout = async (): Promise<any> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("AI_TIMEOUT"));
      }, timeoutMs);
      timer.unref?.();
    });

    const callPromise = genAI.models.generateContent({
      model: modelName,
      contents: formattedParts,
      config: {
        systemInstruction: options.system,
        temperature: options.temperature ?? 0.2,
        responseMimeType: "application/json",
      },
    });

    return Promise.race([callPromise, timeoutPromise]);
  };

  // 2. Execution with retry on transient network/5xx (no retry on 429)
  let lastError: any = null;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await runWithTimeout();
      const text = response?.text?.() || response?.text || "";

      if (!text || text.trim() === "") {
        throw new Error("EMPTY_RESPONSE");
      }

      // Clean markdown code fence if returned
      const cleanJson = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(cleanJson);
      } catch (jsonErr: any) {
        console.warn(`[Gemini JSON Parse Error] Attempt ${attempt}:`, jsonErr.message);
        throw new Error(`INVALID_JSON: ${jsonErr.message}`);
      }

      // Zod validation
      const parseResult = options.zod.safeParse(parsedJson);
      if (!parseResult.success) {
        console.warn(`[Gemini Zod Validation Error] Attempt ${attempt}:`, parseResult.error.format());
        return {
          ok: false,
          code: "invalid_output",
          message: `Schema validation failed: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
          latencyMs: Date.now() - startTime,
        };
      }

      const validatedData = parseResult.data;

      // Save to cache
      if (options.cacheKey) {
        responseCache.set(options.cacheKey, {
          data: validatedData,
          timestamp: Date.now(),
        });
      }

      const latencyMs = Date.now() - startTime;
      console.log(`[Gemini Flash] Success (${latencyMs}ms, model: ${modelName})`);

      return {
        ok: true,
        data: validatedData,
        latencyMs,
      };
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);

      // Handle Timeout
      if (errMsg.includes("AI_TIMEOUT") || errMsg.includes("timeout")) {
        console.warn(`[Gemini Timeout] Request exceeded ${timeoutMs}ms`);
        return {
          ok: false,
          code: "timeout",
          message: `AI request timed out after ${timeoutMs}ms.`,
          latencyMs: Date.now() - startTime,
        };
      }

      // Handle Rate Limit (HTTP 429) -> Hard rule: DO NOT RETRY
      if (
        errMsg.includes("429") ||
        errMsg.includes("quota") ||
        errMsg.includes("RESOURCE_EXHAUSTED")
      ) {
        console.warn("[Gemini Rate Limited] Quota limit reached (429)");
        return {
          ok: false,
          code: "rate_limited",
          message: "AI service is currently rate limited. Falling back to deterministic rules.",
          latencyMs: Date.now() - startTime,
        };
      }

      // Retry on 5xx or transient connection errors if attempts remain
      if (attempt < maxAttempts) {
        console.warn(`[Gemini Transient Error] Retrying attempt ${attempt + 1}...`, errMsg);
        await new Promise((res) => setTimeout(res, 800));
      }
    }
  }

  return {
    ok: false,
    code: "unavailable",
    message: lastError?.message || "Failed to communicate with AI model.",
    latencyMs: Date.now() - startTime,
  };
}
