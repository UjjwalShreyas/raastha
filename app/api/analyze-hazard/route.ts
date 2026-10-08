import { NextRequest, NextResponse } from "next/server";

export interface HazardAnalysisResult {
  isHazard: boolean;
  detectedObject: string;
  hazardType: "Pothole" | "Broken Streetlight" | "Waterlogging" | "Open Manhole" | "Road Debris" | "Other";
  severity: 1 | 2 | 3 | 4 | 5;
  needsFixing: boolean;
  hazardIndex: string;
  confidence: number;
  impactDescription: string;
  recommendedSlaHours: number;
  clarifications?: { question: string }[];
  source: "gemini";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType = "image/jpeg" } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { available: false, error: "Image data is required (imageBase64)." },
        { status: 400 }
      );
    }

    // Server-side only key - NEVER exposed via NEXT_PUBLIC_
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return available: false so UI asks for manual selection. Never fabricate fake AI output!
      return NextResponse.json({
        available: false,
        isApiKeyMissing: true,
        message: "Gemini API key is not configured in .env.local. Please set severity manually.",
      });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const promptText = `
You are an expert civil engineering and municipal civic safety inspector for the civic safety app "Raastha" (Hyderabad GHMC).
Carefully evaluate this uploaded image:

1. "isHazard": boolean.
   - If this image does NOT show a road, pavement, public corridor, or municipal safety issue (e.g., it is a person's face/selfie, indoor living room, food, animal, or completely illegible blur), set "isHazard": false.
   - If it shows an authentic roadway defect, set "isHazard": true.

2. If "isHazard" is false:
   Return JSON:
   {
     "isHazard": false,
     "detectedObject": "Non-hazard / Unclear Subject",
     "hazardType": "Other",
     "severity": 1,
     "needsFixing": false,
     "hazardIndex": "No Hazard Detected",
     "confidence": 95,
     "impactDescription": "The uploaded photo does not appear to show a public roadway or civic infrastructure hazard.",
     "recommendedSlaHours": 48,
     "clarifications": []
   }

3. If "isHazard" is true:
   - "hazardType": One of ["Pothole", "Broken Streetlight", "Waterlogging", "Open Manhole", "Road Debris", "Other"]
   - "detectedObject": Concise description (e.g., "Deep Asphalt Cavity", "Extinguished Streetlight Luminaire", "Open Storm Drain Manhole")
   - "severity": Rating from 1 to 5:
     * 1: Minor superficial hairline crack or cosmetic surface wear (no commuter danger)
     * 2: Shallow depression (<3cm deep), vehicles pass without swerving
     * 3: Moderate defect (3-8cm cavity) or flickering lamp (vehicles must brake/swerve)
     * 4: Deep pothole (>8cm deep) or completely dark stretch without illumination (high two-wheeler spill hazard)
     * 5: Critical cavern / missing manhole cover / massive crater (immediate life safety threat)
   - Streetlight Inspection Rubric:
     * Fully dark luminaire pole array: Severity 4
     * Intermittent flickering / partial ballast failure: Severity 3
     * Dark stretch with zero ambient streetlights nearby: Severity 4 or 5
   - "needsFixing": boolean (true if severity is 3, 4, or 5)
   - "hazardIndex": Formal title (e.g., "Severe Roadway Cavity", "Critical Life Threat", "Dark Pedestrian Corridor")
   - "confidence": Integer 60 to 99 representing visual classification confidence
   - "impactDescription": 1-2 sentence civil engineering analysis of commuter risk and physical defect
   - "recommendedSlaHours": Recommended repair timeline in hours (2 to 48 hours)
   - "clarifications": Array of 2 follow-up clarification questions tailored to what you see in the photo (e.g. "Is standing water obscuring the cavity depth?", "Are multiple lamp poles unlit in series?")

Output MUST be valid JSON only, without any markdown formatting or commentary.
`;

    const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
          response_mime_type: "application/json",
        },
      }),
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.warn(`Gemini API call failed (${apiResponse.status}):`, errText);
      return NextResponse.json({
        available: false,
        error: `Gemini vision API returned status ${apiResponse.status}. Please select severity manually.`,
      });
    }

    const data = await apiResponse.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    const jsonStr = candidateText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(jsonStr);

    const severityClamped = Math.min(
      Math.max(Number(parsed.severity) || 3, 1),
      5
    ) as 1 | 2 | 3 | 4 | 5;

    const result: HazardAnalysisResult = {
      isHazard: typeof parsed.isHazard === "boolean" ? parsed.isHazard : true,
      detectedObject: parsed.detectedObject || "Roadway Defect",
      hazardType: parsed.hazardType || "Pothole",
      severity: severityClamped,
      needsFixing: typeof parsed.needsFixing === "boolean" ? parsed.needsFixing : severityClamped >= 3,
      hazardIndex: parsed.hazardIndex || (severityClamped >= 4 ? "Severe Roadway Hazard" : "Moderate Civic Issue"),
      confidence: Math.min(Math.max(Number(parsed.confidence) || 90, 50), 99),
      impactDescription:
        parsed.impactDescription ||
        "Visual inspection completed. Manual review available below.",
      recommendedSlaHours: Number(parsed.recommendedSlaHours) || (severityClamped >= 4 ? 4 : 24),
      clarifications: Array.isArray(parsed.clarifications)
        ? parsed.clarifications.map((q: any) => ({
            question: typeof q === "string" ? q : q.question || "Is flow blocked?",
          }))
        : undefined,
      source: "gemini",
    };

    return NextResponse.json({
      available: true,
      success: true,
      analysis: result,
      modelUsed: modelName,
    });
  } catch (error: any) {
    console.error("Error in analyze-hazard API:", error);
    return NextResponse.json(
      {
        available: false,
        error: error.message || "Failed to analyze image.",
      },
      { status: 500 }
    );
  }
}
