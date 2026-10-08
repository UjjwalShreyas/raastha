/**
 * Deterministic Civic Safety Scoring Engine for Raastha
 * 
 * HARD RULE: AI NEVER DECIDES SCORES.
 * Segment safety score, route choice, authority priority and SLA timelines
 * are strictly mathematical formulas grounded in civil engineering standards.
 */

export interface ScoredHazard {
  severity: 1 | 2 | 3 | 4 | 5;
  exposureCount?: number;
  distanceToRouteMeters?: number;
}

/**
 * Computes exposure-weighted priority score for municipal repair queue.
 * Formula: (Severity [1-5] * Daily Commuter Exposure Proxy) / 100
 */
export function calculatePriorityScore(
  severity: 1 | 2 | 3 | 4 | 5,
  exposureCount: number
): number {
  const clampedSeverity = Math.min(Math.max(severity, 1), 5);
  const clampedExposure = Math.max(exposureCount, 100);
  return Math.round((clampedSeverity * clampedExposure) / 100);
}

/**
 * Computes deterministic safety index for a geographic corridor (0 - 100).
 * Baseline = 95. Proximity penalty: 5 points per severity level for hazards within 60m.
 */
export function calculateSafetyScore(hazardsNearRoute: ScoredHazard[]): number {
  let penalty = 0;
  for (const hazard of hazardsNearRoute) {
    const sev = Math.min(Math.max(hazard.severity, 1), 5);
    // Weight penalty slightly higher if within 30m
    const distanceFactor =
      hazard.distanceToRouteMeters && hazard.distanceToRouteMeters <= 30
        ? 1.2
        : 1.0;
    penalty += sev * 5 * distanceFactor;
  }
  return Math.max(10, Math.min(99, Math.round(95 - penalty)));
}

/**
 * Calculates target SLA repair window in hours based strictly on severity.
 * Level 5 = 2h, Level 4 = 4h, Level 3 = 12h, Level 2 = 24h, Level 1 = 48h.
 */
export function calculateSlaHours(severity: 1 | 2 | 3 | 4 | 5): number {
  switch (severity) {
    case 5:
      return 2;
    case 4:
      return 4;
    case 3:
      return 12;
    case 2:
      return 24;
    case 1:
    default:
      return 48;
  }
}

/**
 * Estimates daily commuter exposure proxy based on road classification.
 */
export function estimateCommuterExposure(roadClassification: string = "arterial"): number {
  const lower = roadClassification.toLowerCase();
  if (lower.includes("arterial") || lower.includes("ring") || lower.includes("junction")) {
    return 4200;
  }
  if (lower.includes("secondary") || lower.includes("main")) {
    return 2500;
  }
  if (lower.includes("residential") || lower.includes("lane") || lower.includes("cross")) {
    return 800;
  }
  return 1500;
}

/**
 * Evaluates whether an automated before/after fix comparison satisfies municipal quality standards.
 * Requires: fixed === "true", confidence >= 0.70, and same_location_likely === true.
 */
export function isFixAcceptable(
  fixed: "true" | "false" | "uncertain",
  confidence: number,
  sameLocationLikely: boolean
): { acceptable: boolean; reason: string } {
  if (!sameLocationLikely) {
    return {
      acceptable: false,
      reason: "Before and after photos appear to show different locations. Routed to human inspector.",
    };
  }
  if (fixed !== "true") {
    return {
      acceptable: false,
      reason: "Visual defect remains unaddressed or partially defective.",
    };
  }
  if (confidence < 0.7) {
    return {
      acceptable: false,
      reason: `Verification confidence (${Math.round(confidence * 100)}%) is below 70% threshold. Requires field supervisor audit.`,
    };
  }
  return {
    acceptable: true,
    reason: "Asphalt leveling and surface compaction verified above safety threshold.",
  };
}
