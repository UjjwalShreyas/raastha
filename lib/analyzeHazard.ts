import { compressImage } from "./compressImage";
import type {
  AnalyzeHazardResponse,
  AnalyzeHazardSuccess,
  AnalyzeHazardUnavailable,
  HazardType,
} from "@/app/api/analyze-hazard/route";

export type {
  AnalyzeHazardResponse,
  AnalyzeHazardSuccess,
  AnalyzeHazardUnavailable,
  HazardType,
};

export interface AnalyzeHazardClientResult {
  result: AnalyzeHazardResponse;
  compressedFile?: File;
  previewUrl: string;
}

/**
 * Compresses an image File (max 1024px, JPEG 0.85), sends it to /api/analyze-hazard,
 * and returns the analysis response along with the exact compressed File and preview URL.
 */
export async function analyzeHazard(
  input: File | { base64: string; mimeType?: string },
  preferredEngine: "roboflow" | "gemini" = "roboflow"
): Promise<AnalyzeHazardClientResult> {
  let imageBase64: string;
  let mimeType: string = "image/jpeg";
  let compressedFile: File | undefined;
  let previewUrl: string;

  if (input instanceof File) {
    const compressed = await compressImage(input, 1024, 0.85);
    imageBase64 = compressed.base64;
    mimeType = "image/jpeg";
    compressedFile = compressed.file;
    previewUrl = compressed.dataUrl;
  } else {
    imageBase64 = input.base64;
    mimeType = input.mimeType || "image/jpeg";
    previewUrl = input.base64.startsWith("data:")
      ? input.base64
      : `data:${mimeType};base64,${input.base64}`;
  }

  // Call server route
  try {
    const res = await fetch("/api/analyze-hazard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        preferredEngine,
      }),
    });

    const data: AnalyzeHazardResponse = await res.json();
    return {
      result: data,
      compressedFile,
      previewUrl,
    };
  } catch (err: any) {
    return {
      result: {
        available: false,
        reason:
          err?.message || "Network error while connecting to hazard analysis service.",
      },
      compressedFile,
      previewUrl,
    };
  }
}
