import { z } from "zod";

// -----------------------------------------------------------------------------
// 1. Photo Classification Schema
// -----------------------------------------------------------------------------
export const ClassifyOutputSchema = z.object({
  type: z.enum(["pothole", "streetlight", "other", "invalid"]),
  severity: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  confidence: z.number().min(0).max(1),
  hazard_for: z.array(
    z.enum(["pedestrians", "two_wheelers", "cars", "night_commuters", "children"])
  ),
  description_en: z.string(),
  description_local: z.string(),
  looks_authentic: z.boolean(),
  reasoning_short: z.string(),
});

export type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>;

// Rule layer post-processed output
export interface ProcessedClassification {
  type: "pothole" | "streetlight" | "other" | "invalid";
  severity: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  hazard_for: Array<"pedestrians" | "two_wheelers" | "cars" | "night_commuters" | "children">;
  description_en: string;
  description_local: string;
  looks_authentic: boolean;
  reasoning_short: string;
  needsRetake: boolean;
  needsReview: boolean;
  source: "gemini" | "detector" | "fallback";
  detectorHint?: {
    label: string;
    confidence: number;
    box?: { x: number; y: number; width: number; height: number };
  };
}

// -----------------------------------------------------------------------------
// 2. Clarifying Questions Schema
// -----------------------------------------------------------------------------
export const ClarifyOptionSchema = z.object({
  id: z.string(),
  label_local: z.string(),
});

export const ClarifyQuestionSchema = z.object({
  id: z.string(),
  text_local: z.string(),
  options: z.array(ClarifyOptionSchema),
});

export const ClarifyOutputSchema = z.object({
  questions: z.array(ClarifyQuestionSchema).max(3),
});

export type ClarifyOutput = z.infer<typeof ClarifyOutputSchema>;

// -----------------------------------------------------------------------------
// 3. Voice Intent Schema
// -----------------------------------------------------------------------------
export const IntentOutputSchema = z.object({
  intent: z.enum([
    "report_issue",
    "find_safe_route",
    "check_status",
    "change_language",
    "help",
    "unknown",
  ]),
  fields: z
    .object({
      destination: z.string().optional(),
      language: z.enum(["en", "hi", "te"]).optional(),
      reportId: z.string().optional(),
      issueType: z.string().optional(),
    })
    .default({}),
  language: z.enum(["en", "hi", "te"]),
  reply_local: z.string(),
});

export type IntentOutput = z.infer<typeof IntentOutputSchema>;

// -----------------------------------------------------------------------------
// 4. Route Reason Explanation Schema
// -----------------------------------------------------------------------------
export const ExplainRouteOutputSchema = z.object({
  safest_reason_local: z.string(),
  fastest_reason_local: z.string(),
});

export type ExplainRouteOutput = z.infer<typeof ExplainRouteOutputSchema>;

export interface RouteFact {
  kind: "broken_streetlight" | "open_shops" | "recent_hazard" | "unsafe_taps" | "well_lit_arterial";
  count: number;
}

// -----------------------------------------------------------------------------
// 5. Fix Verification Schema
// -----------------------------------------------------------------------------
export const VerifyFixOutputSchema = z.object({
  fixed: z.enum(["true", "false", "uncertain"]),
  confidence: z.number().min(0).max(1),
  note: z.string(),
  same_location_likely: z.boolean(),
});

export type VerifyFixOutput = z.infer<typeof VerifyFixOutputSchema>;
