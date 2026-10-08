import { NextRequest, NextResponse } from "next/server";
import {
  generateJson,
  checkRateLimit,
  computeCacheHash,
} from "@/lib/ai/gemini";
import {
  ClassifyOutputSchema,
  ProcessedClassification,
} from "@/lib/ai/schemas";
import { runPotholeWorkflow, parsePotholeWorkflowResult } from "@/lib/roboflowClient";

const SYSTEM_PROMPT = `
You analyze a single photo submitted by a citizen reporting a street hazard in India.
Decide whether it shows a road or lighting hazard and rate it for pedestrians and two-wheelers.
Return ONLY JSON matching the schema. Be conservative: if the photo is unclear, a screenshot,
a stock image, indoors, or shows no real hazard, use type "invalid" and low confidence.
Severity scale: 1 = cosmetic, 2 = minor, 3 = noticeable risk, 4 = high risk, 5 = dangerous now.
Streetlight issues matter more at night. Do not identify people. Do not read or output number plates.
Write description_local in the requested language (en, hi or te), in one plain sentence
a low-literacy user can understand.
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
    const {
      imageBase64,
      mimeType = "image/jpeg",
      language = "en",
      lat,
      lng,
      detectorHint: clientDetectorHint,
    } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { ok: false, code: "unsafe_input", message: "Missing imageBase64 input." },
        { status: 400 }
      );
    }

    // 1. Validate payload size (reject over ~4MB base64 payload)
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
    if (cleanBase64.length > 5.5 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, code: "unsafe_input", message: "Image payload exceeds 4 MB limit. Please compress." },
        { status: 400 }
      );
    }

    // 2. Optional Detector Pre-Pass (Roboflow / DETECTOR_URL)
    let detectorHint = clientDetectorHint;
    if (!detectorHint && process.env.DETECTOR_URL && process.env.ROBOFLOW_API_KEY) {
      try {
        const rfRes = await runPotholeWorkflow({ type: "base64", value: cleanBase64 });
        const summary = parsePotholeWorkflowResult(rfRes);
        if (summary.potholeCount > 0) {
          const primary = summary.detections[0];
          detectorHint = {
            label: "pothole",
            confidence: primary.confidence,
            box: {
              x: primary.x,
              y: primary.y,
              width: primary.width,
              height: primary.height,
            },
          };
        }
      } catch (detErr) {
        console.warn("[Detector pre-pass skipped]:", detErr);
      }
    }

    // 3. Prepare Gemini prompt parts
    const detectorPromptHint = detectorHint
      ? `\nPre-detection hint from specialized CV model: Identified '${detectorHint.label}' with confidence ${(detectorHint.confidence * 100).toFixed(1)}%.`
      : "";

    const userPrompt = `Target language: ${language}.${detectorPromptHint}${lat && lng ? ` GPS: (${lat}, ${lng})` : ""}`;
    const cacheKey = computeCacheHash(`classify:${language}`, cleanBase64);

    const result = await generateJson({
      system: SYSTEM_PROMPT,
      parts: [
        { inlineData: { mimeType, data: cleanBase64 } },
        { text: userPrompt },
      ],
      zod: ClassifyOutputSchema,
      cacheKey,
      temperature: 0.1,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: result.code === "rate_limited" ? 429 : 500 });
    }

    const aiData = result.data;

    // 4. Apply Rule Layer
    const severityClamped = Math.min(Math.max(aiData.severity, 1), 5) as 1 | 2 | 3 | 4 | 5;
    let confidence = aiData.confidence;
    let needsRetake = false;
    let needsReview = false;

    if (aiData.type === "invalid" || confidence < 0.5 || !aiData.looks_authentic) {
      needsRetake = true;
    }

    if (detectorHint && detectorHint.label) {
      const detLabel = detectorHint.label.toLowerCase();
      const aiType = aiData.type.toLowerCase();
      // If detector found a clear pothole but Gemini classed it as something else
      if (detLabel === "pothole" && aiType !== "pothole" && aiType !== "other") {
        confidence = Math.max(0.4, confidence - 0.2);
        needsReview = true;
      }
    }

    const processed: ProcessedClassification = {
      type: aiData.type,
      severity: severityClamped,
      confidence: Math.round(confidence * 100) / 100,
      hazard_for: aiData.hazard_for,
      description_en: aiData.description_en,
      description_local: aiData.description_local,
      looks_authentic: aiData.looks_authentic,
      reasoning_short: aiData.reasoning_short,
      needsRetake,
      needsReview,
      source: "gemini",
      detectorHint,
    };

    return NextResponse.json({
      ok: true,
      data: processed,
      cached: result.cached,
      latencyMs: result.latencyMs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, code: "unavailable", message: err.message || "Failed to classify photo." },
      { status: 500 }
    );
  }
}
