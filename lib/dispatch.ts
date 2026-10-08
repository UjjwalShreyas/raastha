import type { Issue } from "@/context/IssuesContext";
import { getDistanceInMeters } from "./geoUtils";

export interface RouteRequestLog {
  id?: string;
  created_at?: string;
  waypoints?: [number, number][] | null;
}

/**
 * Fallback proxy based on road classification when there are few route requests.
 * Arterial road sectors carry higher baseline pedestrian and commuter volume.
 */
export const DEFAULT_COMMUTER_ESTIMATE = 3500;

export function getRoadClassProxy(issue: Partial<Issue>): number {
  if (issue.commuter_estimate && issue.commuter_estimate > 0) {
    return issue.commuter_estimate;
  }
  const ward = (issue.ward || "").toLowerCase();
  // Serilingampally / Hitec City / Jubilee Hills arterials have high commuter density
  if (ward.includes("serilingampally") || ward.includes("jubilee") || ward.includes("banjara")) {
    return 4500;
  }
  if (ward.includes("charminar") || ward.includes("secunderabad") || ward.includes("khairatabad")) {
    return 3800;
  }
  return DEFAULT_COMMUTER_ESTIMATE;
}

/**
 * Counts how many logged route requests in the last 24h passed within ~30 m of this issue.
 */
export function computeRouteMatchesForIssue(
  issue: Pick<Issue, "lat" | "lng">,
  recentRoutes: RouteRequestLog[] = []
): number {
  if (!recentRoutes || recentRoutes.length === 0) return 0;
  let matches = 0;

  for (const req of recentRoutes) {
    if (!req.waypoints || !Array.isArray(req.waypoints)) continue;
    const isNear = req.waypoints.some(
      (pt) => getDistanceInMeters(pt[0], pt[1], issue.lat, issue.lng) <= 30
    );
    if (isNear) matches++;
  }

  return matches;
}

/**
 * Computes estimated daily commuters:
 * count of route requests passing within ~30 m in the last 24 h (scaled to city population),
 * plus a clearly labelled road class baseline proxy.
 */
export function commuterCalculationDetails(
  issue: Pick<Issue, "lat" | "lng"> & Partial<Issue>,
  recentRoutes: RouteRequestLog[] = []
): { commuters: number; routeMatches: number; label: string; formulaExplanation: string } {
  const roadClassBaseline = getRoadClassProxy(issue);
  const routeMatches = computeRouteMatchesForIssue(issue, recentRoutes);

  // Each route request represents active navigation demand on this corridor.
  // We scale active query samples by 25 to model commuter volume.
  const routeVolume = routeMatches * 25;
  const commuters = Math.round(roadClassBaseline + routeVolume);

  let label: string;
  let formulaExplanation: string;

  if (routeMatches > 0) {
    label = `${commuters.toLocaleString()} (${routeMatches} Raastha route requests in 24h + road baseline)`;
    formulaExplanation = `Estimated from ${routeMatches} Raastha route requests passing within 30m in last 24h + road class baseline (${roadClassBaseline.toLocaleString()})`;
  } else {
    label = `${commuters.toLocaleString()} (road class baseline proxy)`;
    formulaExplanation = `Road class baseline proxy (0 Raastha route requests within 30m in last 24h)`;
  }

  return { commuters, routeMatches, label, formulaExplanation };
}

export function commuterEstimate(
  issue: Pick<Issue, "lat" | "lng"> & Partial<Issue>,
  recentRoutes: RouteRequestLog[] = []
): number {
  return commuterCalculationDetails(issue, recentRoutes).commuters;
}

/** exposure = (severity x daily commuters) / 100 */
export function exposureScore(
  issue: Pick<Issue, "severity" | "lat" | "lng"> & Partial<Issue>,
  recentRoutes: RouteRequestLog[] = []
): number {
  const commuters = commuterEstimate(issue, recentRoutes);
  return Math.round((issue.severity * commuters) / 100);
}

/** Highest exposure first; ties go to higher severity, then the older report. */
export function compareByExposure(
  a: Issue,
  b: Issue,
  recentRoutes: RouteRequestLog[] = []
): number {
  const diff = exposureScore(b, recentRoutes) - exposureScore(a, recentRoutes);
  if (diff !== 0) return diff;
  if (b.severity !== a.severity) return b.severity - a.severity;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

/** Resolution SLA (hours from dispatch) by severity. */
export function slaHoursForSeverity(severity: number): number {
  if (severity >= 5) return 4;
  if (severity === 4) return 8;
  if (severity === 3) return 24;
  return 72;
}

export function computeSlaDueAt(severity: number, from: Date = new Date()): string {
  return new Date(from.getTime() + slaHoursForSeverity(severity) * 3600 * 1000).toISOString();
}

export function isHighSeverityAlertable(issue: Issue): boolean {
  return issue.severity >= 4 && issue.status === "reported" && !issue.is_sample;
}

export type SlaState = { kind: "none" } | { kind: "ok" | "overdue"; ms: number };

/** SLA only applies once dispatched and until resolved/rejected. */
export function slaState(issue: Issue, now: number): SlaState {
  if (!now || !issue.sla_due_at || issue.status === "resolved" || issue.status === "rejected") {
    return { kind: "none" };
  }
  const ms = new Date(issue.sla_due_at).getTime() - now;
  return { kind: ms < 0 ? "overdue" : "ok", ms: Math.abs(ms) };
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
