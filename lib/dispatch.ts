import type { Issue } from "@/context/IssuesContext";

/**
 * Commuter volume is NOT measured. It is the reporter's own estimate from the
 * report form slider (stored as issues.commuter_estimate). Rows created before
 * that column existed fall back to this default.
 */
export const DEFAULT_COMMUTER_ESTIMATE = 3500;

export function commuterEstimate(issue: Pick<Issue, "commuter_estimate">): number {
  return issue.commuter_estimate ?? DEFAULT_COMMUTER_ESTIMATE;
}

/** exposure = (severity x commuters per day) / 100 */
export function exposureScore(issue: Pick<Issue, "severity" | "commuter_estimate">): number {
  return Math.round((issue.severity * commuterEstimate(issue)) / 100);
}

/** Highest exposure first; ties go to higher severity, then the older report. */
export function compareByExposure(a: Issue, b: Issue): number {
  const diff = exposureScore(b) - exposureScore(a);
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
