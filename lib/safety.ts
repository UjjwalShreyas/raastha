import { getDistanceInMeters } from "./geoUtils";
import type { Issue } from "@/context/IssuesContext";

export interface SampledPoint {
  lat: number;
  lng: number;
}

export interface NearbyHazardMatch {
  issueId: string;
  trackingId: string;
  type: string;
  severity: number;
  ward: string | null;
  minDistanceMeters: number;
}

export interface RouteSafetyAssessment {
  safetyScore: number; // 15 to 100
  openHazardsCount: number;
  nearbyStreetlightsCount: number;
  nearbyPotholesCount: number;
  nearbyOtherHazardsCount: number;
  matchedHazards: NearbyHazardMatch[];
  computedReasons: string[];
  sampledPointsCount: number;
}

export interface RouteCandidate {
  id: string;
  name: string;
  coordinates: [number, number][]; // [lat, lng]
  distanceMeters: number;
  durationSeconds: number;
  instructions: Array<{ text: string; dist: string; duration?: number }>;
  isStraightLineFallback?: boolean;
}

export interface RankedRoute extends RouteCandidate {
  safety: RouteSafetyAssessment;
  isRecommended: boolean;
  recommendationReason: string;
  compositeRankScore: number;
  extraDistanceMeters: number;
  extraDistancePercent: number;
  color: string;
  weight: number;
  dashArray?: string;
}

const SAMPLE_INTERVAL_METERS = 25; // Sample point every ~25m
const HAZARD_PROXIMITY_THRESHOLD_METERS = 30; // Check reports within ~30m

/**
 * Samples points along a route polyline so that no gap between consecutive
 * points exceeds `intervalMeters` (~25 m).
 */
export function sampleRoutePoints(
  coordinates: [number, number][],
  intervalMeters = SAMPLE_INTERVAL_METERS
): [number, number][] {
  if (coordinates.length <= 1) return coordinates;

  const sampled: [number, number][] = [];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    sampled.push(p1);

    const dist = getDistanceInMeters(p1[0], p1[1], p2[0], p2[1]);
    if (dist > intervalMeters) {
      const steps = Math.floor(dist / intervalMeters);
      for (let s = 1; s <= steps; s++) {
        const fraction = (s * intervalMeters) / dist;
        const lat = p1[0] + (p2[0] - p1[0]) * fraction;
        const lng = p1[1] + (p2[1] - p1[1]) * fraction;
        sampled.push([lat, lng]);
      }
    }
  }

  sampled.push(coordinates[coordinates.length - 1]);
  return sampled;
}

/**
 * Computes an explainable safety score for a route by sampling every ~25m and
 * checking against OPEN hazard reports within ~30m.
 */
export function computeRouteSafety(
  coordinates: [number, number][],
  issues: Issue[],
  distanceMeters: number,
  durationSeconds: number,
  isStraightLineFallback = false
): RouteSafetyAssessment {
  const sampledPoints = sampleRoutePoints(coordinates, SAMPLE_INTERVAL_METERS);

  // Filter only OPEN reports (ignore resolved or rejected)
  const openIssues = issues.filter(
    (iss) => iss.status !== "resolved" && iss.status !== "rejected"
  );

  const matchedHazards: NearbyHazardMatch[] = [];
  let penaltyPoints = 0;
  let nearbyStreetlightsCount = 0;
  let nearbyPotholesCount = 0;
  let nearbyOtherHazardsCount = 0;

  for (const issue of openIssues) {
    let minDistance = Infinity;

    for (const pt of sampledPoints) {
      const d = getDistanceInMeters(pt[0], pt[1], issue.lat, issue.lng);
      if (d < minDistance) minDistance = d;
      // Early exit if right next to hazard
      if (minDistance <= 5) break;
    }

    if (minDistance <= HAZARD_PROXIMITY_THRESHOLD_METERS) {
      matchedHazards.push({
        issueId: issue.id,
        trackingId: issue.tracking_id,
        type: issue.type,
        severity: issue.severity,
        ward: issue.ward,
        minDistanceMeters: Math.round(minDistance),
      });

      // Severity-weighted penalty
      if (issue.type === "streetlight") {
        nearbyStreetlightsCount++;
        penaltyPoints += issue.severity * 9;
      } else if (issue.type === "pothole") {
        nearbyPotholesCount++;
        penaltyPoints += issue.severity * 7;
      } else {
        nearbyOtherHazardsCount++;
        penaltyPoints += issue.severity * 5;
      }
    }
  }

  // Base score 98; subtract penalties, clamp to [15, 99]
  const baseScore = 98;
  const rawScore = baseScore - penaltyPoints;
  const safetyScore = Math.max(15, Math.min(99, rawScore));

  // Build strictly human-readable reasons that were actually computed
  const computedReasons: string[] = [];

  if (isStraightLineFallback) {
    computedReasons.push(
      "Straight-line projected corridor (OpenRouteService routing unavailable)"
    );
  }

  if (nearbyStreetlightsCount > 0) {
    computedReasons.push(
      `Passes ${nearbyStreetlightsCount} open streetlight outage report(s) within ~30m`
    );
  }

  if (nearbyPotholesCount > 0) {
    computedReasons.push(
      `Passes ${nearbyPotholesCount} open road cavity / pothole report(s) within ~30m`
    );
  }

  if (nearbyOtherHazardsCount > 0) {
    computedReasons.push(
      `Passes ${nearbyOtherHazardsCount} other open civic hazard report(s) within ~30m`
    );
  }

  if (matchedHazards.length === 0) {
    computedReasons.push(
      `0 open hazard reports detected within 30m of sampled corridor`
    );
    computedReasons.push(
      `Well-lit corridor clear of known active road cavitations`
    );
  }

  const distKm = (distanceMeters / 1000).toFixed(1);
  const durMin = Math.max(1, Math.round(durationSeconds / 60));
  computedReasons.push(`Route length: ${distKm} km (~${durMin} mins)`);

  return {
    safetyScore,
    openHazardsCount: matchedHazards.length,
    nearbyStreetlightsCount,
    nearbyPotholesCount,
    nearbyOtherHazardsCount,
    matchedHazards,
    computedReasons,
    sampledPointsCount: sampledPoints.length,
  };
}

/**
 * Evaluates up to 3 candidate routes, ranks them by combining safety and extra
 * distance, and identifies the recommended corridor.
 */
export function rankAndRecommendRoutes(
  candidates: RouteCandidate[],
  issues: Issue[]
): RankedRoute[] {
  if (candidates.length === 0) return [];

  const minDistance = Math.min(...candidates.map((c) => c.distanceMeters));

  const scored: RankedRoute[] = candidates.map((cand, index) => {
    const safety = computeRouteSafety(
      cand.coordinates,
      issues,
      cand.distanceMeters,
      cand.durationSeconds,
      cand.isStraightLineFallback
    );

    const extraDistM = Math.max(0, cand.distanceMeters - minDistance);
    const extraDistPct =
      minDistance > 0 ? Math.round((extraDistM / minDistance) * 100) : 0;

    // Composite utility: penalize excessive detour (each 10% detour reduces rank score by 2.5 points)
    const detourPenalty = (extraDistPct / 10) * 2.5;
    const compositeRankScore = Math.round(safety.safetyScore - detourPenalty);

    return {
      ...cand,
      safety,
      isRecommended: false,
      recommendationReason: "",
      compositeRankScore,
      extraDistanceMeters: extraDistM,
      extraDistancePercent: extraDistPct,
      color: "#3E000C",
      weight: 4,
    };
  });

  // Pick route with highest compositeRankScore as recommended
  let highestScore = -Infinity;
  let recommendedIndex = 0;

  scored.forEach((r, idx) => {
    if (r.compositeRankScore > highestScore) {
      highestScore = r.compositeRankScore;
      recommendedIndex = idx;
    }
  });

  const PALETTE = [
    { color: "#3E000C", weight: 6 }, // Primary Recommended
    { color: "rgba(62, 0, 12, 0.55)", weight: 4, dashArray: "6, 6" },
    { color: "rgba(180, 83, 9, 0.75)", weight: 4, dashArray: "4, 8" },
  ];

  return scored.map((r, idx) => {
    const isRecommended = idx === recommendedIndex;
    const style = PALETTE[idx % PALETTE.length];

    let recReason = "";
    if (isRecommended) {
      if (r.extraDistancePercent <= 5) {
        recReason = "Best combination: highest safety with minimal extra distance.";
      } else {
        recReason = `Recommended: significantly safer (+${r.safety.safetyScore} score) despite +${r.extraDistancePercent}% distance.`;
      }
    } else if (r.extraDistancePercent === 0) {
      recReason = "Shortest path, but passes near more reported road hazards.";
    } else {
      recReason = "Alternative secondary route.";
    }

    return {
      ...r,
      isRecommended,
      recommendationReason: recReason,
      color: isRecommended ? "#3E000C" : style.color,
      weight: isRecommended ? 6 : style.weight,
      dashArray: isRecommended ? undefined : style.dashArray,
    };
  });
}
