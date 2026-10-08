import { ProcessedClassification } from "@/lib/ai/schemas";

export interface ClassifyPhotoOptions {
  mimeType?: string;
  language?: "en" | "hi" | "te";
  lat?: number;
  lng?: number;
  detectorHint?: {
    label: string;
    confidence: number;
    box?: { x: number; y: number; width: number; height: number };
  };
}

export async function classifyPhoto(
  imageBase64: string,
  options: ClassifyPhotoOptions = {}
): Promise<{ ok: boolean; data: ProcessedClassification; isMock?: boolean; error?: string }> {
  // Offline mock switch for live demo fallbacks
  if (process.env.NEXT_PUBLIC_USE_MOCK_AI === "true") {
    return {
      ok: true,
      isMock: true,
      data: {
        type: "pothole",
        severity: 4,
        confidence: 0.94,
        hazard_for: ["two_wheelers", "pedestrians"],
        description_en: "Deep asphalt pothole causing severe wheel rim risk and pedestrian skidding.",
        description_local:
          options.language === "hi"
            ? "सड़क पर गहरा गड्ढा है जिससे दोपहिया वाहनों को खतरा हो सकता है।"
            : options.language === "te"
            ? "రోడ్డుపై లోతైన గుంత ఉంది, ఇది ద్విచక్ర వాహనదారులకు ప్రమాదకరం."
            : "Deep asphalt crater with loose rubble requiring immediate patch repair.",
        looks_authentic: true,
        reasoning_short: "Visible surface cavity and fractured asphalt borders.",
        needsRetake: false,
        needsReview: false,
        source: "fallback",
      },
    };
  }

  try {
    const res = await fetch("/api/ai/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64,
        mimeType: options.mimeType || "image/jpeg",
        language: options.language || "en",
        lat: options.lat,
        lng: options.lng,
        detectorHint: options.detectorHint,
      }),
    });

    const json = await res.json();
    if (json.ok && json.data) {
      return { ok: true, data: json.data };
    }
    return {
      ok: false,
      error: json.message || "Failed to classify photo",
      data: {
        type: "pothole",
        severity: 3,
        confidence: 0.8,
        hazard_for: ["pedestrians", "two_wheelers"],
        description_en: "Roadway surface defect identified.",
        description_local: "Road defect logged for manual verification.",
        looks_authentic: true,
        reasoning_short: "AI fallback applied.",
        needsRetake: false,
        needsReview: true,
        source: "fallback",
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message || "Network error",
      data: {
        type: "pothole",
        severity: 3,
        confidence: 0.8,
        hazard_for: ["pedestrians", "two_wheelers"],
        description_en: "Roadway surface defect identified.",
        description_local: "Road defect logged for manual verification.",
        looks_authentic: true,
        reasoning_short: "Network fallback applied.",
        needsRetake: false,
        needsReview: true,
        source: "fallback",
      },
    };
  }
}
