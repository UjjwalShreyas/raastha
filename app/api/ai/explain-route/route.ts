import { NextRequest, NextResponse } from "next/server";
import { generateJson, checkRateLimit, computeCacheHash } from "@/lib/ai/gemini";
import { ExplainRouteOutputSchema, RouteFact } from "@/lib/ai/schemas";

const SYSTEM_PROMPT = `
You are a concise safe-navigation explainer for the pedestrian navigation app "Raastha" in India.
You will be provided strictly with computed numbers and verified road facts for TWO route options:
1. Safest Illuminated Route
2. Fastest Shortcut Route

CRITICAL CONSTRAINTS:
- Use ONLY the numbers and facts provided in the input.
- NEVER invent hazards, shops, lights, or statistics that were not explicitly listed.
- NEVER state any number/digit that does not appear in the input numbers or facts.
- Output exactly one clear sentence per route in the requested language (en, hi, or te).
`;

/**
 * Validates that any numbers/digits appearing in the AI explanation were genuinely present in the input.
 */
export function postValidateDigits(
  text: string,
  allowedNumbers: Set<number>
): boolean {
  // Extract all digit sequences
  const matches = text.match(/\d+/g);
  if (!matches) return true;

  for (const match of matches) {
    const num = parseInt(match, 10);
    if (!allowedNumbers.has(num)) {
      console.warn(`[Digit Post-Validation Failed] Extracted digit ${num} not in allowed inputs:`, Array.from(allowedNumbers));
      return false;
    }
  }
  return true;
}

/**
 * Deterministic template fallback when AI is unavailable or fails post-validation.
 */
export function buildTemplateRouteExplanation(
  safestFacts: RouteFact[],
  fastestFacts: RouteFact[],
  language: "en" | "hi" | "te" = "en"
): { safest_reason_local: string; fastest_reason_local: string } {
  const streetlightsAvoided = fastestFacts.find((f) => f.kind === "broken_streetlight")?.count || 0;
  const shopsCount = safestFacts.find((f) => f.kind === "open_shops")?.count || 4;

  if (language === "hi") {
    return {
      safest_reason_local: `यह मार्ग ${streetlightsAvoided > 0 ? `${streetlightsAvoided} अंधेरे मोड़ों से बचाता है और ` : ""}रोशन मुख्य सड़कों से होकर जाता है।`,
      fastest_reason_local: `यह सबसे छोटा रास्ता है लेकिन इसमें कुछ कम रोशनी वाली गलियां हो सकती हैं।`,
    };
  }

  if (language === "te") {
    return {
      safest_reason_local: `ఈ మార్గం ${streetlightsAvoided > 0 ? `${streetlightsAvoided} చీకటి మలుపులను తప్పించి ` : ""}వెలుతురున్న ప్రధాన రహదారుల గుండా వెళుతుంది.`,
      fastest_reason_local: `ఇది అత్యంత వేగవంతమైన మార్గం కానీ తక్కువ వెలుతురు గల సందులు ఉండవచ్చు.`,
    };
  }

  return {
    safest_reason_local: `Follows well-lit arterial roads${streetlightsAvoided > 0 ? `, avoiding ${streetlightsAvoided} unlit sections` : ""} past active commercial areas.`,
    fastest_reason_local: `Shortest travel time, but passes through quieter secondary corridors with lower illumination.`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { ok: false, code: "rate_limited", message: "Rate limit reached." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      safestRoute = { minutes: 14, km: 1.2, safetyScore: 94, facts: [] as RouteFact[] },
      fastestRoute = { minutes: 10, km: 0.9, safetyScore: 68, facts: [] as RouteFact[] },
      language = "en",
    } = body;

    const allowedNumbers = new Set<number>();
    allowedNumbers.add(Math.round(safestRoute.minutes));
    allowedNumbers.add(Math.round(fastestRoute.minutes));
    allowedNumbers.add(Math.round(safestRoute.safetyScore));
    allowedNumbers.add(Math.round(fastestRoute.safetyScore));
    safestRoute.facts?.forEach((f: RouteFact) => allowedNumbers.add(f.count));
    fastestRoute.facts?.forEach((f: RouteFact) => allowedNumbers.add(f.count));

    const cacheKey = computeCacheHash(
      `explain-route:${language}`,
      { safestRoute, fastestRoute }
    );

    const result = await generateJson({
      system: SYSTEM_PROMPT,
      parts: [
        {
          text: `Target language: ${language}.\nSAFEST ROUTE: ${JSON.stringify(safestRoute)}\nFASTEST ROUTE: ${JSON.stringify(fastestRoute)}`,
        },
      ],
      zod: ExplainRouteOutputSchema,
      cacheKey,
      temperature: 0.1,
    });

    if (!result.ok) {
      const fallback = buildTemplateRouteExplanation(
        safestRoute.facts || [],
        fastestRoute.facts || [],
        language
      );
      return NextResponse.json({
        ok: true,
        data: fallback,
        source: "template_fallback",
        latencyMs: result.latencyMs,
      });
    }

    // Post-Validate Digits: discard if model hallucinated unlisted numbers
    const validSafest = postValidateDigits(result.data.safest_reason_local, allowedNumbers);
    const validFastest = postValidateDigits(result.data.fastest_reason_local, allowedNumbers);

    if (!validSafest || !validFastest) {
      console.warn("[Post-Validation Rejection] Discarding AI text with non-input digits. Using template fallback.");
      const fallback = buildTemplateRouteExplanation(
        safestRoute.facts || [],
        fastestRoute.facts || [],
        language
      );
      return NextResponse.json({
        ok: true,
        data: fallback,
        source: "template_fallback_sanitized",
        latencyMs: result.latencyMs,
      });
    }

    return NextResponse.json({
      ok: true,
      data: result.data,
      source: "gemini",
      cached: result.cached,
      latencyMs: result.latencyMs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, code: "unavailable", message: err.message || "Route explainer error." },
      { status: 500 }
    );
  }
}
