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
  compressedFile: File;
  previewUrl: string;
}

/**
 * Compresses an image File (max 1024px, JPEG 0.7), sends it to /api/analyze-hazard,
 * and returns the analysis response along with the exact compressed File.
 */
export async function analyzeHazard(rawFile: File): Promise<AnalyzeHazardClientResult> {
  // 1. Client-side compression
  const compressed = await compressImage(rawFile, 1024, 0.7);

  // 2. Call server route
  try {
    const res = await fetch("/api/analyze-hazard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: compressed.base64,
        mimeType: "image/jpeg",
      }),
    });

    const data: AnalyzeHazardResponse = await res.json();
    return {
      result: data,
      compressedFile: compressed.file,
      previewUrl: compressed.dataUrl,
    };
  } catch (err: any) {
    return {
      result: {
        available: false,
        reason:
          err?.message || "Network error while connecting to hazard analysis service.",
      },
      compressedFile: compressed.file,
      previewUrl: compressed.dataUrl,
    };
  }
}
