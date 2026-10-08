import { NextRequest, NextResponse } from "next/server";
import { generateJson, checkRateLimit, computeCacheHash } from "@/lib/ai/gemini";
import { VerifyFixOutputSchema } from "@/lib/ai/schemas";
import { isFixAcceptable } from "@/lib/scoring";

const SYSTEM_PROMPT = `
You are an expert civil engineering quality assurance auditor for municipal road and civic safety works.
You will receive two photos of a reported civic hazard:
Photo 1: BEFORE the municipal repair.
Photo 2: AFTER the municipal repair.

Your task:
1. Verify if Photo 1 and Photo 2 depict the same geographical location / angle (street curb, asphalt patch, background buildings, or geometry). If they appear to be completely different places, set same_location_likely to false and fixed to "uncertain".
2. Evaluate if the hazard has been properly repaired, leveled with fresh asphalt / concrete, and made safe for pedestrians and two-wheelers.
3. Return strict JSON matching the schema:
   - fixed: "true" | "false" | "uncertain"
   - confidence: number between 0.0 and 1.0
   - note: concise 1-2 sentence civil audit summary
   - same_location_likely: boolean
`;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { ok: false, code: "rate_limited", message: "Rate limit exceeded. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { beforeBase64, afterBase64, issueType = "Pothole", lat, lng } = body;

    if (!afterBase64) {
      return NextResponse.json(
        { ok: false, code: "unsafe_input", message: "After photo is required for fix verification." },
        { status: 400 }
      );
    }

    const cleanAfter = afterBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
    const cleanBefore = beforeBase64
      ? beforeBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "")
      : null;

    const parts: any[] = [];
    if (cleanBefore) {
      parts.push({ text: `PHOTO 1: BEFORE REPAIR (${issueType})` });
      parts.push({ inlineData: { mimeType: "image/jpeg", data: cleanBefore } });
    }
    parts.push({ text: `PHOTO 2: AFTER REPAIR (${issueType})` });
    parts.push({ inlineData: { mimeType: "image/jpeg", data: cleanAfter } });
    parts.push({
      text: `Audit the repair for a ${issueType}${lat && lng ? ` at GPS coordinates (${lat}, ${lng})` : ""}. Return JSON only.`,
    });

    const cacheKey = computeCacheHash("verify-fix", cleanAfter.substring(0, 1000) + (cleanBefore ? cleanBefore.substring(0, 1000) : ""));

    const result = await generateJson({
      system: SYSTEM_PROMPT,
      parts,
      zod: VerifyFixOutputSchema,
      cacheKey,
      temperature: 0.1,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: result.code === "rate_limited" ? 429 : 500 });
    }

    const aiData = result.data;
    const ruleEvaluation = isFixAcceptable(
      aiData.fixed,
      aiData.confidence,
      aiData.same_location_likely
    );

    return NextResponse.json({
      ok: true,
      data: {
        ...aiData,
        needsHumanReview: !ruleEvaluation.acceptable,
        auditDecision: ruleEvaluation.acceptable ? "APPROVED" : "NEEDS_HUMAN_REVIEW",
        auditReason: ruleEvaluation.reason,
      },
      cached: result.cached,
      latencyMs: result.latencyMs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, code: "unavailable", message: err.message || "Failed to verify fix photo." },
      { status: 500 }
    );
  }
}
