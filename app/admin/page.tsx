"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  TrendingUp,
  Clock,
  CheckCircle2,
  Send,
  Sparkles,
  Bell,
  BellRing,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle,
  LogOut,
  UploadCloud,
  Play,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useIssues, Issue, IssueStatus, IssueType } from "@/context/IssuesContext";
import { DynamicMap } from "@/components/map/DynamicMap";
import { AlertToast } from "@/components/admin/AlertToast";
import { Button } from "@/components/ui/Button";
import { GHMC_WARDS } from "@/lib/wards";
import { enableAudio, isAudioEnabled, playBeep } from "@/lib/beep";
import {
  commuterEstimate,
  compareByExposure,
  computeSlaDueAt,
  exposureScore,
  formatDuration,
  isHighSeverityAlertable,
  slaHoursForSeverity,
  slaState,
} from "@/lib/dispatch";

const TYPE_KEY: Record<IssueType, string> = {
  pothole: "typePothole",
  streetlight: "typeStreetlight",
  garbage: "typeGarbage",
  waterlogging: "typeWaterlogging",
  other: "typeOther",
};

const STATUS_KEY: Record<IssueStatus, string> = {
  reported: "statusReported",
  dispatched: "statusDispatched",
  in_progress: "statusInProgress",
  resolved: "statusResolved",
  rejected: "statusRejected",
};

interface AiCheckResult {
  available: boolean;
  repaired?: boolean;
  confidence?: number;
  summary?: string;
  reason?: string;
}

/** Downscale before sending to the AI route to keep the request small. */
async function fileToResizedDataUrl(file: File, maxSide = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { t, showToast } = useApp();
  const { isAuthenticated, isLoading: authLoading, displayName, user, session, signOut } = useAuth();
  const {
    issues,
    updateIssueStatus,
    latestAlert,
    clearAlert,
    realtimeStatus,
    unseenHighCount,
    markHighSeen,
    markAllHighSeen,
  } = useIssues();

  // Filters
  const [selectedCircle, setSelectedCircle] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Alerts
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(false);
  const [soundBlocked, setSoundBlocked] = useState<boolean>(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Dispatch / status actions
  const [dispatchOpenId, setDispatchOpenId] = useState<string | null>(null);
  const [assigneeInput, setAssigneeInput] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Resolve modal
  const [resolvingIssue, setResolvingIssue] = useState<Issue | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AiCheckResult | null>(null);
  const [resolveBusy, setResolveBusy] = useState<boolean>(false);

  // Ticks so SLA countdowns stay current
  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Route guard: logged-out users never see the dashboard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Audio may already be unlocked from earlier interaction in this tab
  useEffect(() => {
    setAlertsEnabled(isAudioEnabled());
  }, []);

  // Beep when a new severity 4-5 report arrives live
  const alertId = latestAlert?.id;
  useEffect(() => {
    if (!alertId || !isAuthenticated) return;
    setSoundBlocked(!playBeep());
  }, [alertId, isAuthenticated]);

  // Scroll to the issue the officer chose to view
  useEffect(() => {
    if (!highlightId) return;
    document.getElementById(`issue-${highlightId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [highlightId]);

  // Free the object URL when the proof photo changes or the modal closes
  useEffect(() => {
    return () => {
      if (afterPreview) URL.revokeObjectURL(afterPreview);
    };
  }, [afterPreview]);

  const sortedIssues = useMemo(() => {
    const filtered = issues.filter((iss) => {
      if (selectedCircle !== "all" && !iss.ward?.startsWith(`${selectedCircle} -`)) return false;
      if (selectedCategory !== "all" && iss.type !== selectedCategory) return false;
      return true;
    });
    return [...filtered].sort(compareByExposure);
  }, [issues, selectedCircle, selectedCategory]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center text-xs text-[#3E000C]/70 font-sans flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{t("authChecking")}</span>
      </div>
    );
  }

  const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

  const handleEnableAlerts = async () => {
    const ok = await enableAudio();
    setAlertsEnabled(ok);
    setSoundBlocked(!ok);
    if (ok) playBeep();
  };

  const handleViewAlert = () => {
    if (!latestAlert) return;
    const id = latestAlert.id;
    markHighSeen(id);
    clearAlert();
    setSelectedCircle("all");
    setSelectedCategory("all");
    setHighlightId(id);
  };

  const handleDismissAlert = () => {
    if (latestAlert) markHighSeen(latestAlert.id);
    clearAlert();
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/admin/login");
  };

  const openDispatch = (issue: Issue) => {
    setDispatchOpenId(issue.id);
    setAssigneeInput(displayName);
  };

  const handleConfirmDispatch = async (issue: Issue) => {
    const assignee = assigneeInput.trim();
    if (!assignee) return;
    setBusyId(issue.id);
    try {
      await updateIssueStatus(issue.id, "dispatched", {
        assignee,
        slaDueAt: computeSlaDueAt(issue.severity),
        note: `Dispatched to ${assignee}. Resolution SLA ${slaHoursForSeverity(issue.severity)}h.`,
      });
      markHighSeen(issue.id);
      setDispatchOpenId(null);
    } catch (e) {
      showToast(`${t("actionFailed")}: ${errMsg(e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleStartWork = async (issue: Issue) => {
    setBusyId(issue.id);
    try {
      await updateIssueStatus(issue.id, "in_progress", {
        note: `Work started (${displayName}).`,
      });
    } catch (e) {
      showToast(`${t("actionFailed")}: ${errMsg(e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const openResolve = (issue: Issue) => {
    setResolvingIssue(issue);
    setAfterFile(null);
    setAfterPreview(null);
    setAiResult(null);
  };

  const closeResolve = () => {
    setResolvingIssue(null);
    setAfterFile(null);
    setAfterPreview(null);
    setAiResult(null);
  };

  const handleAfterPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAfterFile(file);
    setAfterPreview(URL.createObjectURL(file));
    setAiResult(null);
  };

  const handleRunAiCheck = async () => {
    if (!resolvingIssue || !afterFile) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const dataUrl = await fileToResizedDataUrl(afterFile);
      const res = await fetch("/api/verify-fix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ afterImage: dataUrl, hazardType: resolvingIssue.type }),
      });
      const json = (await res.json()) as AiCheckResult;
      setAiResult(json);
    } catch {
      setAiResult({ available: false, reason: "Network error" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirmResolve = async () => {
    if (!resolvingIssue || !afterFile) return;
    setResolveBusy(true);
    const aiNote = aiResult?.available
      ? `AI check: ${aiResult.repaired ? "looks repaired" : "flagged possible defect"} (${Math.round(
          (aiResult.confidence ?? 0) * 100
        )}%). ${aiResult.summary ?? ""}`
      : "AI check not used or unavailable.";
    try {
      await updateIssueStatus(resolvingIssue.id, "resolved", {
        afterPhoto: afterFile,
        note: `Verified by ${displayName}. ${aiNote}`,
      });
      closeResolve();
    } catch (e) {
      showToast(`${t("actionFailed")}: ${errMsg(e)}`);
    } finally {
      setResolveBusy(false);
    }
  };

  // Stats (all derived from real rows)
  const openIssues = issues.filter((i) => i.status !== "resolved" && i.status !== "rejected");
  const inProgressCount = issues.filter(
    (i) => i.status === "dispatched" || i.status === "in_progress"
  ).length;
  const overdueCount = issues.filter((i) => slaState(i, now).kind === "overdue").length;
  const commutersProtected = issues
    .filter((i) => i.status === "resolved")
    .reduce((sum, i) => sum + commuterEstimate(i), 0);

  const wardMapMarkers = sortedIssues.map((i) => ({
    id: i.id,
    lat: i.lat,
    lng: i.lng,
    title: i.description || `${t(TYPE_KEY[i.type])} · ${i.ward ?? ""}`,
    type: i.type,
    severity: i.severity,
    description: `${i.tracking_id} | ${t(STATUS_KEY[i.status])}`,
  }));

  const rtLabel = {
    live: t("rtLive"),
    polling: t("rtPolling"),
    connecting: t("rtConnecting"),
    offline: t("rtOffline"),
  }[realtimeStatus];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-sans">
      <AnimatePresence>
        {latestAlert && isHighSeverityAlertable(latestAlert) && (
          <AlertToast
            title={t("newHighAlert")}
            typeLabel={t(TYPE_KEY[latestAlert.type])}
            ward={latestAlert.ward || "Hyderabad"}
            severity={latestAlert.severity}
            trackingId={latestAlert.tracking_id}
            viewLabel={t("viewBtn")}
            dismissLabel={t("dismissBtn")}
            soundBlockedMessage={soundBlocked ? t("alertsSoundBlocked") : null}
            onView={handleViewAlert}
            onDismiss={handleDismissAlert}
          />
        )}
      </AnimatePresence>

      {/* Portal Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3E000C]/12 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-[#3E000C]/8 border border-[#3E000C]/15 text-[#3E000C] text-xs font-bold mb-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>
              {t("authorityPortal")} · {t("signedInAs")} {user?.email}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#3E000C] tracking-tight">
            {t("adminPortalTitle")}
          </h1>
          <p className="text-[#3E000C]/65 text-xs mt-0.5">{t("adminPortalSubtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Realtime connection status */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
              realtimeStatus === "live"
                ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                : "bg-amber-100 text-amber-900 border-amber-300"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                realtimeStatus === "live" ? "bg-emerald-600 animate-pulse" : "bg-amber-600"
              }`}
            />
            {rtLabel}
          </span>

          {/* Sound unlock (browsers block audio before a user gesture) */}
          {alertsEnabled ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#3E000C]/8 text-[#3E000C] border border-[#3E000C]/15">
              <BellRing className="w-3.5 h-3.5" />
              {t("alertsOn")}
            </span>
          ) : (
            <Button
              type="button"
              variant="amber"
              size="sm"
              onClick={handleEnableAlerts}
              title={t("alertsHint")}
              leftIcon={<BellRing className="w-3.5 h-3.5" />}
            >
              {t("enableAlerts")}
            </Button>
          )}

          {/* Unseen high-severity badge */}
          <button
            type="button"
            onClick={markAllHighSeen}
            title={t("unseenHighLabel")}
            aria-label={`${t("unseenHighLabel")}: ${unseenHighCount}`}
            className="p-2 rounded-xl bg-white border border-[#3E000C]/15 text-[#3E000C] hover:bg-[#3E000C]/5 transition-all shadow-2xs cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            {unseenHighCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-700 text-white text-[9px] font-black flex items-center justify-center">
                {unseenHighCount}
              </span>
            )}
          </button>

          <select
            value={selectedCircle}
            onChange={(e) => setSelectedCircle(e.target.value)}
            aria-label={t("filterAllCircles")}
            className="bg-white border border-[#3E000C]/15 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#3E000C] focus:outline-none focus:border-[#3E000C]/50 cursor-pointer shadow-2xs"
          >
            <option value="all">{t("filterAllCircles")}</option>
            {GHMC_WARDS.map((w) => (
              <option key={w.id} value={w.circle}>
                {w.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label={t("allCategories")}
            className="bg-white border border-[#3E000C]/15 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#3E000C] focus:outline-none focus:border-[#3E000C]/50 cursor-pointer shadow-2xs"
          >
            <option value="all">{t("allCategories")}</option>
            {(Object.keys(TYPE_KEY) as IssueType[]).map((k) => (
              <option key={k} value={k}>
                {t(TYPE_KEY[k])}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#3E000C]/20 bg-white text-xs font-semibold text-[#3E000C] hover:bg-red-50 hover:text-red-700 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t("signOut")}</span>
          </button>
        </div>
      </div>

      {soundBlocked && !latestAlert && (
        <div className="text-xs text-amber-900 bg-amber-100/90 border border-amber-300 rounded-xl px-3 py-2">
          {t("alertsSoundBlocked")}
        </div>
      )}

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-2xl p-4 space-y-0.5 shadow-2xs">
          <span className="text-[11px] text-[#3E000C]/60 font-semibold block">{t("statTotalIssues")}</span>
          <div className="text-2xl font-black text-[#3E000C]">{openIssues.length}</div>
        </div>
        <div className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-2xl p-4 space-y-0.5 shadow-2xs">
          <span className="text-[11px] text-red-800 font-bold block">{t("statSlaOverdue")}</span>
          <div className="text-2xl font-black text-red-800">{overdueCount}</div>
        </div>
        <div className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-2xl p-4 space-y-0.5 shadow-2xs">
          <span className="text-[11px] text-[#3E000C]/60 font-semibold block">{t("statUnitsDispatched")}</span>
          <div className="text-2xl font-black text-[#3E000C]">{inProgressCount}</div>
        </div>
        <div className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-2xl p-4 space-y-0.5 shadow-2xs">
          <span className="text-[11px] text-[#3E000C]/60 font-semibold block">{t("statCommutersProtected")}</span>
          <div className="text-2xl font-black text-[#3E000C]">{commutersProtected.toLocaleString()}</div>
          <span className="text-[10px] text-[#3E000C]/55 block">{t("estimateFromReports")}</span>
        </div>
      </div>

      {/* Main Grid: Queue & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-3.5">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#3E000C] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#3E000C]" />
              <span>{t("adminQueueTitle")}</span>
            </h2>
            <p className="text-[11px] text-[#3E000C]/70">
              {t("exposureFormula")}. {t("exposureTieBreak")} {t("commuterEstimateNote")}
            </p>
          </div>

          <div className="space-y-3">
            {sortedIssues.map((issue, index) => {
              const score = exposureScore(issue);
              const commuters = commuterEstimate(issue);
              const sla = slaState(issue, now);
              const isSample = issue.is_sample || issue.tracking_id.startsWith("SAMPLE-");
              const isBusy = busyId === issue.id;
              const isClosed = issue.status === "resolved" || issue.status === "rejected";
              const isHighlighted = highlightId === issue.id;

              return (
                <div
                  key={issue.id}
                  id={`issue-${issue.id}`}
                  onClick={() => isHighlighted && setHighlightId(null)}
                  className={`bg-[#FFFFFF]/90 border rounded-2xl p-4 sm:p-5 transition-all shadow-2xs space-y-3.5 ${
                    isHighlighted
                      ? "border-[#3E000C] ring-2 ring-[#3E000C]/60"
                      : sla.kind === "overdue"
                      ? "border-red-900/35 bg-red-900/5"
                      : isClosed
                      ? "border-emerald-800/20 bg-emerald-900/5 opacity-80"
                      : "border-[#3E000C]/12 hover:border-[#3E000C]/30"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-[#3E000C]/60">#{index + 1}</span>
                        <span className="font-mono text-xs font-bold text-[#3E000C] px-2 py-0.5 rounded bg-[#3E000C]/8 border border-[#3E000C]/12">
                          {issue.tracking_id}
                        </span>
                        {isSample ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                            {t("sampleDataBadge")}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                            {t("liveReportBadge")}
                          </span>
                        )}
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#3E000C] text-[#FFECD1]">
                          Sev {issue.severity}/5
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#3E000C]/8 text-[#3E000C]">
                          {t(TYPE_KEY[issue.type])}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#3E000C]/60 font-medium">
                        {issue.ward || "Hyderabad"}
                      </div>
                      <h3 className="font-bold text-sm text-[#3E000C]">
                        {issue.description || `${t(TYPE_KEY[issue.type])} · ${issue.ward ?? ""}`}
                      </h3>
                      {issue.ai_summary && (
                        <p className="text-xs text-[#3E000C]/75">{issue.ai_summary}</p>
                      )}
                    </div>

                    {/* How exposure was computed */}
                    <div className="sm:text-right shrink-0">
                      <div className="text-xs font-semibold text-[#3E000C]/60">{t("exposureIndex")}</div>
                      <div className="text-xl font-black text-[#3E000C]">
                        {score} <span className="text-xs font-normal">{t("pts")}</span>
                      </div>
                      <div className="text-[10px] text-[#3E000C]/70 font-mono">
                        ({issue.severity} × {commuters.toLocaleString()}) / 100 = {score}
                      </div>
                    </div>
                  </div>

                  {/* Dispatch details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-3 rounded-xl bg-[#FFECD1]/25 border border-[#3E000C]/10 text-xs">
                    <div>
                      <span className="text-[10px] text-[#3E000C]/60 block font-semibold">{t("exposureCount")}</span>
                      <span className="font-bold text-[#3E000C]">≈ {commuters.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#3E000C]/60 block font-semibold">Status</span>
                      <span className="font-bold text-[#3E000C]">{t(STATUS_KEY[issue.status])}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#3E000C]/60 block font-semibold">{t("assignedTo")}</span>
                      <span className="font-bold text-[#3E000C]">
                        {issue.assignee || t("notDispatched")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#3E000C]/60 block font-semibold">{t("slaDeadline")}</span>
                      {issue.sla_due_at ? (
                        <span className="font-bold text-[#3E000C] block leading-tight">
                          {new Date(issue.sla_due_at).toLocaleString()}
                          {sla.kind !== "none" && (
                            <span
                              className={`block text-[10px] font-semibold ${
                                sla.kind === "overdue" ? "text-red-800" : "text-[#3E000C]/70"
                              }`}
                            >
                              {sla.kind === "overdue"
                                ? `${t("slaOverdueBy")} ${formatDuration(sla.ms)}`
                                : `${formatDuration(sla.ms)} ${t("slaLeft")}`}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="font-bold text-[#3E000C]/50">—</span>
                      )}
                    </div>
                  </div>

                  {/* Inline dispatch form */}
                  {dispatchOpenId === issue.id && issue.status === "reported" && (
                    <div className="p-3 rounded-xl border border-[#3E000C]/20 bg-[#FFECD1]/30 space-y-2.5">
                      <label
                        htmlFor={`assignee-${issue.id}`}
                        className="text-[11px] font-bold text-[#3E000C]/70 uppercase tracking-wider block"
                      >
                        {t("assigneeLabel")}
                      </label>
                      <input
                        id={`assignee-${issue.id}`}
                        type="text"
                        value={assigneeInput}
                        onChange={(e) => setAssigneeInput(e.target.value)}
                        placeholder={t("assigneePlaceholder")}
                        className="w-full bg-white border border-[#3E000C]/20 rounded-xl px-3 py-2 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]"
                      />
                      <p className="text-[11px] text-[#3E000C]/75">
                        {t("slaWillBe")}: <strong>{slaHoursForSeverity(issue.severity)}h</strong> →{" "}
                        {new Date(computeSlaDueAt(issue.severity, now ? new Date(now) : undefined)).toLocaleString()}
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setDispatchOpenId(null)}
                          disabled={isBusy}
                        >
                          {t("cancelBtn")}
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={isBusy || !assigneeInput.trim()}
                          onClick={() => handleConfirmDispatch(issue)}
                          leftIcon={
                            isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />
                          }
                        >
                          {isBusy ? t("working") : t("confirmDispatch")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions: reported -> dispatched -> in_progress -> resolved */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#3E000C]/10">
                    {issue.status === "reported" && dispatchOpenId !== issue.id && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => openDispatch(issue)}
                        leftIcon={<Send className="w-3.5 h-3.5" />}
                      >
                        {t("dispatchSquad")}
                      </Button>
                    )}

                    {issue.status === "dispatched" && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleStartWork(issue)}
                        leftIcon={
                          isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />
                        }
                      >
                        {isBusy ? t("working") : t("startWork")}
                      </Button>
                    )}

                    {issue.status === "in_progress" && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => openResolve(issue)}
                        leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#FFECD1]" />}
                      >
                        {t("verifyResolve")}
                      </Button>
                    )}

                    {issue.status === "resolved" && (
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-emerald-100 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t("fixNeutralized")}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: GIS map */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-3xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#3E000C] uppercase tracking-wider">
                {t("hazardRadar")}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#3E000C]/8 text-[#3E000C]">
                {sortedIssues.length} {t("pins")}
              </span>
            </div>
            <div className="h-80 rounded-2xl overflow-hidden border border-[#3E000C]/12">
              <DynamicMap center={[17.385, 78.4867]} zoom={14} markers={wardMapMarkers} />
            </div>
          </div>
        </div>
      </div>

      {/* Resolve with repair proof */}
      <AnimatePresence>
        {resolvingIssue && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t("resolveTitle")}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#FFFFFF] border border-[#3E000C]/20 rounded-3xl p-6 shadow-2xl space-y-5 text-[#3E000C] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#3E000C]/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#3E000C]" />
                  <h3 className="font-bold text-base">{t("resolveTitle")}</h3>
                </div>
                <button
                  type="button"
                  onClick={closeResolve}
                  aria-label={t("cancelBtn")}
                  className="p-1 rounded-lg hover:bg-[#3E000C]/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#3E000C]/60 block uppercase">
                    {t("statusReported")}
                  </span>
                  <div className="h-32 rounded-xl overflow-hidden border border-[#3E000C]/15 bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvingIssue.photo_url}
                      alt={t("statusReported")}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#3E000C]/60 block uppercase">
                    {t("statusResolved")}
                  </span>
                  <label className="h-32 rounded-xl overflow-hidden border border-dashed border-[#3E000C]/30 bg-[#FFECD1]/30 flex items-center justify-center cursor-pointer text-center">
                    {afterPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={afterPreview} alt={t("statusResolved")} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[11px] font-semibold px-2 flex flex-col items-center gap-1">
                        <UploadCloud className="w-5 h-5" />
                        {t("uploadAfterPhoto")}
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleAfterPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {afterFile && (
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-full"
                    disabled={aiLoading}
                    onClick={handleRunAiCheck}
                    leftIcon={
                      aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />
                    }
                  >
                    {aiLoading ? t("aiChecking") : t("runAiCheck")}
                  </Button>

                  {aiResult && !aiResult.available && (
                    <p className="text-xs text-amber-900 bg-amber-100/90 border border-amber-300 rounded-xl p-3">
                      {t("aiUnavailable")}
                      {aiResult.reason ? ` (${aiResult.reason})` : ""}
                    </p>
                  )}

                  {aiResult?.available && (
                    <div
                      className={`p-3 rounded-xl border space-y-1 text-xs ${
                        aiResult.repaired
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                          : "bg-red-50 border-red-300 text-red-900"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          {aiResult.repaired ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <AlertTriangle className="w-4 h-4" />
                          )}
                          {aiResult.repaired ? t("statusResolved") : t("aiFlaggedDefect")}
                        </span>
                        <span>
                          {t("confidenceLabel")}: {Math.round((aiResult.confidence ?? 0) * 100)}%
                        </span>
                      </div>
                      <p>{aiResult.summary}</p>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant={aiResult?.available && !aiResult.repaired ? "danger" : "primary"}
                    size="md"
                    className="w-full"
                    disabled={resolveBusy}
                    onClick={handleConfirmResolve}
                    leftIcon={
                      resolveBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )
                    }
                  >
                    {resolveBusy
                      ? t("working")
                      : aiResult?.available && !aiResult.repaired
                      ? t("closeAnyway")
                      : t("closeTicket")}
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
