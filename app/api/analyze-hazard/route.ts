import { NextRequest, NextResponse } from "next/server";

export type HazardType = "pothole" | "streetlight" | "garbage" | "waterlogging" | "other";

export interface AnalyzeHazardSuccess {
  available: true;
  isHazard: boolean;
  type: HazardType;
  severity: number; // 1-5
  confidence: number; // 0-1
  summary: string;
  imageQuality: "good" | "unclear";
  followUpQuestions?: string[];
}

export interface AnalyzeHazardUnavailable {
  available: false;
  reason: string;
}

export type AnalyzeHazardResponse = AnalyzeHazardSuccess | AnalyzeHazardUnavailable;

// In-memory rate limiting: 10 requests per minute per IP
const ipRateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;
  const timestamps = (ipRateLimitMap.get(ip) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    return false;
  }

  timestamps.push(now);
  ipRateLimitMap.set(ip, timestamps);
  return true;
}

export async function POST(req: NextRequest) {
  // 1. Per-IP Rate Limiting (10 requests/minute)
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  if (!checkRateLimit(clientIp)) {
    return NextResponse.json<AnalyzeHazardUnavailable>(
      {
        available: false,
        reason: "Rate limit exceeded (maximum 10 requests/minute). Please select severity manually.",
      },
      { status: 429 }
    );
  }

  // 2. Server-side only key - NEVER exposed via NEXT_PUBLIC_*
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json<AnalyzeHazardUnavailable>({
      available: false,
      reason: "GEMINI_API_KEY is not configured on the server. Please select severity manually.",
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<AnalyzeHazardUnavailable>(
      { available: false, reason: "Malformed JSON request body." },
      { status: 400 }
    );
  }

  const { imageBase64, mimeType = "image/jpeg" } = body || {};

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json<AnalyzeHazardUnavailable>(
      { available: false, reason: "Image data (imageBase64) is required." },
      { status: 400 }
    );
  }

  // 3. Reject oversized images (> 6MB raw string)
  if (imageBase64.length > 6 * 1024 * 1024) {
    return NextResponse.json<AnalyzeHazardUnavailable>(
      { available: false, reason: "Image payload exceeds maximum size limit (6MB)." },
      { status: 400 }
    );
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, "");

  // Single model configuration (no loops)
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const promptText = `
You are an expert civic infrastructure safety inspector for the civic safety app "Raastha" in Hyderabad, India.
Inspect this image and evaluate whether it shows an authentic civic defect or danger on a public roadway, corridor, or pavement.

Evaluation & Scoring Rubric:
1. isHazard (boolean):
   - If the photo does not depict a public civic hazard (e.g., indoor room, selfie, document, food, animal, or completely clear undamaged road), set isHazard=false, severity=1, type="other", and summary="No civic hazard detected in this photo."
   - If it depicts an authentic road or civic hazard, set isHazard=true.
2. imageQuality:
   - "unclear" if blurry, heavily obscured, or too dark to inspect with confidence.
   - "good" if reasonably legible.
3. type:
   - Must be one of: "pothole", "streetlight", "garbage", "waterlogging", "other".
4. Severity Rubric (1-5 estimate):
   - Pothole:
     * 1: Hairline crack or superficial surface distress.
     * 2: Shallow depression with minimal commuter risk.
     * 3: Moderate cavity causing vehicles to slow or swerve.
     * 4: Deep, sharp cavity in travel lane posing two-wheeler spill hazard.
     * 5: Very large or deep crater in a travel lane posing critical accident danger.
   - Streetlight:
     * 1: Dim luminaire with marginal illumination.
     * 2: Flickering lamp or intermittent ballast.
     * 3: One lamp out.
     * 4: Dark stretch with multiple consecutive lamps unlit.
     * 5: Fully dark road or junction with zero illumination.
   - Garbage: 1 minor litter ... 5 massive garbage pile blocking carriageway or storm drain.
   - Waterlogging: 1 shallow puddle ... 5 submerged carriageway preventing safe passage.
   - Other: 1-5 based on obstruction or commuter fall/collision risk.
5. Critical Guidelines:
   - State that severity is an estimate; NEVER claim exact centimetre depth or fabricated dimensions.
   - summary: Exactly one plain, realistic sentence summarizing the hazard and its impact.
   - confidence: Float between 0.0 and 1.0.
   - followUpQuestions: At most 2 concise questions to assist municipal maintenance crew (e.g. "Is the pothole located in a fast lane or shoulder?", "Are consecutive lights unlit on this stretch?"). Empty array if not a hazard.
`;

  // 4. Call Gemini REST generateContent endpoint with 20s timeout and responseSchema
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            isHazard: { type: "BOOLEAN" },
            type: {
              type: "STRING",
              enum: ["pothole", "streetlight", "garbage", "waterlogging", "other"],
            },
            severity: { type: "INTEGER" },
            confidence: { type: "NUMBER" },
            summary: { type: "STRING" },
            imageQuality: {
              type: "STRING",
              enum: ["good", "unclear"],
            },
            followUpQuestions: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
          required: [
            "isHazard",
            "type",
            "severity",
            "confidence",
            "summary",
            "imageQuality",
          ],
        },
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Gemini API returned status ${res.status}:`, errText);
      return NextResponse.json<AnalyzeHazardUnavailable>({
        available: false,
        reason: `Gemini vision API returned status ${res.status}. Please select severity manually.`,
      });
    }

    const data = await res.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return NextResponse.json<AnalyzeHazardUnavailable>({
        available: false,
        reason: "No response content received from vision model. Please select severity manually.",
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(candidateText);
    } catch {
      return NextResponse.json<AnalyzeHazardUnavailable>({
        available: false,
        reason: "Unable to parse model JSON output. Please select severity manually.",
      });
    }

    // Clamp severity to 1-5
    const rawSeverity = Number(parsed.severity) || 3;
    const clampedSeverity = Math.min(Math.max(Math.round(rawSeverity), 1), 5);

    // Normalize confidence between 0 and 1
    let rawConfidence = Number(parsed.confidence);
    if (isNaN(rawConfidence) || rawConfidence < 0) rawConfidence = 0.85;
    if (rawConfidence > 1) rawConfidence = rawConfidence / 100;
    const clampedConfidence = Math.min(Math.max(Number(rawConfidence.toFixed(2)), 0), 1);

    // Validate type enum
    const validTypes: HazardType[] = ["pothole", "streetlight", "garbage", "waterlogging", "other"];
    const parsedType = String(parsed.type).toLowerCase() as HazardType;
    const finalType: HazardType = validTypes.includes(parsedType) ? parsedType : "other";

    // Validate imageQuality enum
    const finalQuality: "good" | "unclear" = parsed.imageQuality === "unclear" ? "unclear" : "good";

    // Filter at most 2 follow-up questions
    const followUps: string[] = Array.isArray(parsed.followUpQuestions)
      ? parsed.followUpQuestions.slice(0, 2).map((q: any) => String(q).trim()).filter(Boolean)
      : [];

    const output: AnalyzeHazardSuccess = {
      available: true,
      isHazard: Boolean(parsed.isHazard),
      type: finalType,
      severity: clampedSeverity,
      confidence: clampedConfidence,
      summary: String(parsed.summary || "Visual estimate completed.").trim(),
      imageQuality: finalQuality,
      followUpQuestions: followUps.length > 0 ? followUps : undefined,
    };

    return NextResponse.json(output);
  } catch (err: any) {
    if (err.name === "AbortError") {
      return NextResponse.json<AnalyzeHazardUnavailable>({
        available: false,
        reason: "Analysis timed out after 20 seconds. Please select severity manually.",
      });
    }
    console.error("Hazard analysis error:", err);
    return NextResponse.json<AnalyzeHazardUnavailable>({
      available: false,
      reason: err?.message || "Internal analysis failure. Please select severity manually.",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
