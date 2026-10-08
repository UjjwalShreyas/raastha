import { NextRequest, NextResponse } from "next/server";
import { generateJson, checkRateLimit, computeCacheHash } from "@/lib/ai/gemini";
import { ClarifyOutputSchema, ClarifyOutput } from "@/lib/ai/schemas";

const SYSTEM_PROMPT = `
You generate clarifying questions for a citizen who just photographed a road or lighting hazard in India.
Your task: Select AT MOST 3 relevant questions strictly from this approved set:
1. "streetlight_condition": Streetlight fully off vs flickering?
2. "sensitive_zone": Near a school, hospital, or bus stop?
3. "night_safety": Do you feel unsafe walking here after dark?
4. "path_blockage": Is the hazard blocking the main walkable pedestrian path?

CONSTRAINTS:
- Do NOT invent new topics outside the 4 approved questions above.
- Translate the questions and options accurately into the requested language (en, hi, or te).
- Keep labels concise (2-4 words) so they render cleanly on mobile chips.
`;

export function buildFallbackClarifications(
  type: string = "pothole",
  lang: "en" | "hi" | "te" = "en"
): ClarifyOutput {
  if (lang === "hi") {
    return {
      questions: [
        {
          id: "path_blockage",
          text_local: "क्या यह गड्ढा पैदल चलने का रास्ता रोक रहा है?",
          options: [
            { id: "blocking_yes", label_local: "हाँ, पूरी तरह" },
            { id: "blocking_partial", label_local: "आंशिक रूप से" },
            { id: "blocking_no", label_local: "नहीं" },
          ],
        },
        {
          id: "sensitive_zone",
          text_local: "क्या यह किसी स्कूल, अस्पताल या बस स्टॉप के पास है?",
          options: [
            { id: "near_school", label_local: "स्कूल/कॉलेज" },
            { id: "near_bus", label_local: "बस स्टॉप" },
            { id: "near_hospital", label_local: "अस्पताल" },
            { id: "near_none", label_local: "सामान्य सड़क" },
          ],
        },
      ],
    };
  }

  if (lang === "te") {
    return {
      questions: [
        {
          id: "path_blockage",
          text_local: "ఈ ప్రమాదం నడిచే దారిని అడ్డుకుంటోందా?",
          options: [
            { id: "blocking_yes", label_local: "అవును, పూర్తిగా" },
            { id: "blocking_no", label_local: "లేదు" },
          ],
        },
        {
          id: "night_safety",
          text_local: "రాత్రి వేళ ఇక్కడ నడవడం సురక్షితంగా అనిపించలేదా?",
          options: [
            { id: "unsafe_yes", label_local: "అవును, చీకటిగా ఉంది" },
            { id: "unsafe_no", label_local: "పర్వాలేదు" },
          ],
        },
      ],
    };
  }

  return {
    questions: [
      {
        id: "path_blockage",
        text_local: "Is this hazard blocking the pedestrian walkway or vehicle flow?",
        options: [
          { id: "blocking_full", label_local: "Completely Blocking" },
          { id: "blocking_partial", label_local: "Partially Blocking" },
          { id: "blocking_none", label_local: "Clear Flow" },
        ],
      },
      {
        id: "sensitive_zone",
        text_local: "Is this located near a high-footfall sensitive hub?",
        options: [
          { id: "near_transit", label_local: "Bus / Metro Station" },
          { id: "near_school", label_local: "School / Hospital" },
          { id: "near_residential", label_local: "Residential Lane" },
        ],
      },
    ],
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
    const { classification = {}, language = "en", lat, lng } = body;

    const cacheKey = computeCacheHash(
      `clarify:${language}`,
      { type: classification.type, severity: classification.severity }
    );

    const result = await generateJson({
      system: SYSTEM_PROMPT,
      parts: [
        {
          text: `Target language: ${language}. Hazard Classification: ${JSON.stringify(classification)}${lat && lng ? ` Location: (${lat}, ${lng})` : ""}`,
        },
      ],
      zod: ClarifyOutputSchema,
      cacheKey,
      temperature: 0.1,
    });

    if (!result.ok) {
      const fallback = buildFallbackClarifications(classification.type, language);
      return NextResponse.json({
        ok: true,
        data: fallback,
        source: "template_fallback",
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
      { ok: false, code: "unavailable", message: err.message || "Clarification generator error." },
      { status: 500 }
    );
  }
}
