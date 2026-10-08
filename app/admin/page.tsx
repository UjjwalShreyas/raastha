"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  Send,
  Sparkles,
  Bell,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Camera,
  X,
  Loader2,
  CheckCircle,
  Lock,
  KeyRound,
  LogOut,
  UploadCloud,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { DynamicMap } from "@/components/map/DynamicMap";
import { Button } from "@/components/ui/Button";
import { HazardIssue } from "@/lib/mockData";

export default function AdminWardPortalPage() {
  const {
    issues,
    updateIssueStatus,
    unreadAlertCount,
    clearUnreadAlerts,
    highPriorityToast,
    isOfficerAuthenticated,
    setOfficerAuthenticated,
    t,
  } = useApp();

  // Login form state
  const [officerIdInput, setOfficerIdInput] = useState<string>("GHMC-OFFICER-104");
  const [passkeyInput, setPasskeyInput] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Filters & State
  const [selectedWard, setSelectedWard] = useState<string>("All Circles");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Types");
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  // AI Fix Verification Modal state
  const [verifyingIssue, setVerifyingIssue] = useState<HazardIssue | null>(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string>(
    "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80"
  );
  const [isAiVerifying, setIsAiVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    confidence: number;
    verdict: string;
    patchQuality: string;
    civilNotes: string;
  } | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passkeyInput === "GHMC-2026" || passkeyInput === "admin" || passkeyInput === "raastha") {
      setOfficerAuthenticated(true);
      setAuthError(null);
    } else {
      setAuthError("Invalid Officer Passkey. (Use demo passkey: GHMC-2026)");
    }
  };

  const handleDemoBypass = () => {
    setOfficerAuthenticated(true);
    setAuthError(null);
  };

  // If not authenticated, render Authority Login Gate
  if (!isOfficerAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 border border-[#3E000C]/15 rounded-3xl p-6 sm:p-8 shadow-md space-y-6 text-[#3E000C]"
        >
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#3E000C] text-[#FFECD1] flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">GHMC Ward Authority Login</h1>
            <p className="text-xs text-[#3E000C]/70 font-normal">
              Official command dashboard restricted to GHMC circle engineers & municipal contractors.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#3E000C]/70 uppercase tracking-wider block">
                Officer ID
              </label>
              <input
                type="text"
                value={officerIdInput}
                onChange={(e) => setOfficerIdInput(e.target.value)}
                placeholder="e.g. GHMC-OFFICER-104"
                className="w-full bg-[#FFECD1]/20 border border-[#3E000C]/20 rounded-xl px-3 py-2 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#3E000C]/70 uppercase tracking-wider block">
                Passkey
              </label>
              <input
                type="password"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                placeholder="Enter passkey (Demo: GHMC-2026)"
                className="w-full bg-[#FFECD1]/20 border border-[#3E000C]/20 rounded-xl px-3 py-2 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]"
              />
            </div>

            {authError && (
              <div className="text-xs text-red-700 bg-red-100/70 border border-red-300 p-2.5 rounded-xl font-medium">
                {authError}
              </div>
            )}

            <Button variant="primary" size="md" className="w-full font-bold">
              Sign In to Command Portal
            </Button>
          </form>

          <div className="pt-2 text-center border-t border-[#3E000C]/10">
            <button
              type="button"
              onClick={handleDemoBypass}
              className="text-xs font-bold text-[#3E000C] underline cursor-pointer hover:opacity-80"
            >
              Demo Quick Access (Officer #104)
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const filteredIssues = issues.filter((iss) => {
    if (selectedWard !== "All Circles" && !iss.location.ward.includes(selectedWard)) {
      return false;
    }
    if (selectedCategory !== "All Types" && iss.type !== selectedCategory) {
      return false;
    }
    return true;
  });

  const prioritySortedIssues = [...filteredIssues].sort(
    (a, b) => b.priorityScore - a.priorityScore
  );

  const handleDispatchUnit = async (id: string) => {
    setDispatchingId(id);
    await updateIssueStatus(
      id,
      "In Progress",
      undefined,
      "Assigned to GHMC Rapid Asphalt Squad #4 (Serilingampally Circle)"
    );
    setDispatchingId(null);
  };

  const handleOpenVerifyModal = (issue: HazardIssue) => {
    setVerifyingIssue(issue);
    setVerificationResult(null);
  };

  const handleRunAiVerification = async () => {
    if (!verifyingIssue) return;
    setIsAiVerifying(true);

    try {
      const res = await fetch("/api/verify-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beforeImage: verifyingIssue.beforePhoto,
          afterImage: afterPhotoUrl,
          hazardType: verifyingIssue.type,
        }),
      });

      const data = await res.json();
      if (data.success && data.verification) {
        setVerificationResult(data.verification);
      }
    } catch (e) {
      console.warn("AI fix verification error:", e);
    } finally {
      setIsAiVerifying(false);
    }
  };

  const handleConfirmResolution = async () => {
    if (!verifyingIssue) return;
    await updateIssueStatus(
      verifyingIssue.id,
      "Resolved",
      afterPhotoUrl,
      verificationResult?.civilNotes || "Repair verified by Municipal Engineering Unit."
    );
    setVerifyingIssue(null);
  };

  const totalReported = issues.length;
  const overdueCount = issues.filter((i) => i.slaMinutesRemaining < 0 && i.status !== "Resolved").length;
  const inProgressCount = issues.filter((i) => i.status === "In Progress").length;
  const totalCommutersImpacted = issues.reduce((acc, i) => acc + i.exposureCount, 0);

  const wardMapMarkers = prioritySortedIssues.map((i) => ({
    id: i.id,
    lat: i.location.lat,
    lng: i.location.lng,
    title: i.title,
    type: i.type,
    severity: i.severity,
    description: `Priority: ${i.priorityScore} (${i.exposureCount} commuters proxy)`,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-sans">
      {/* Toast Alert for Live Influx of Severity 4-5 Hazards */}
      {highPriorityToast && (
        <div className="p-3 bg-red-900/10 border border-red-900/25 rounded-2xl flex items-center justify-between text-xs text-red-900">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-red-700 animate-pulse" />
            <span>{highPriorityToast}</span>
          </div>
          <button
            onClick={clearUnreadAlerts}
            className="text-[11px] underline font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Portal Header with Officer Info & Sign Out */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3E000C]/12 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-[#3E000C]/8 border border-[#3E000C]/15 text-[#3E000C] text-xs font-bold mb-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>GHMC Ward Command | Officer #104 (Serilingampally / Madhapur)</span>
          </div>
          <h1 className="text-2xl font-bold text-[#3E000C] tracking-tight">
            Exposure-Weighted Municipal Dispatch
          </h1>
          <p className="text-[#3E000C]/65 text-xs mt-0.5">
            Auto-ranked municipal queue: Priority = (Severity × Commuter Volume Proxy) / 100 with 30m duplicate clustering
          </p>
        </div>

        {/* Filters, Bell, & Sign Out */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Notification Bell Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={clearUnreadAlerts}
              className="p-2 rounded-xl bg-white border border-[#3E000C]/15 text-[#3E000C] hover:bg-[#3E000C]/5 transition-all shadow-2xs cursor-pointer relative"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center animate-bounce">
                  {unreadAlertCount}
                </span>
              )}
            </button>
          </div>

          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="bg-white border border-[#3E000C]/15 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#3E000C] focus:outline-none focus:border-[#3E000C]/50 cursor-pointer shadow-2xs"
          >
            <option value="All Circles">All Hyderabad Circles</option>
            <option value="Circle 20">Circle 20 - Madhapur / Serilingampally</option>
            <option value="Circle 18">Circle 18 - Jubilee Hills</option>
            <option value="Circle 21">Circle 21 - Gachibowli</option>
            <option value="Ward 104">Ward 104 - Kondapur</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-[#3E000C]/15 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#3E000C] focus:outline-none focus:border-[#3E000C]/50 cursor-pointer shadow-2xs"
          >
            <option value="All Types">All Hazard Types</option>
            <option value="Pothole">Potholes</option>
            <option value="Broken Streetlight">Streetlights</option>
            <option value="Open Manhole">Manholes</option>
            <option value="Waterlogging">Waterlogging</option>
          </select>

          <button
            onClick={() => setOfficerAuthenticated(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#3E000C]/20 bg-white text-xs font-semibold text-[#3E000C] hover:bg-red-50 hover:text-red-700 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-2xl p-4 space-y-0.5 shadow-2xs">
          <span className="text-[11px] text-[#3E000C]/60 font-semibold block">Total Active Issues</span>
          <div className="text-2xl font-black text-[#3E000C]">{totalReported}</div>
        </div>
        <div className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-2xl p-4 space-y-0.5 shadow-2xs">
          <span className="text-[11px] text-red-800 font-bold block">SLA Overdue</span>
          <div className="text-2xl font-black text-red-800">{overdueCount}</div>
        </div>
        <div className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-2xl p-4 space-y-0.5 shadow-2xs">
          <span className="text-[11px] text-[#3E000C]/60 font-semibold block">Active Units Dispatched</span>
          <div className="text-2xl font-black text-[#3E000C]">{inProgressCount}</div>
        </div>
        <div className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-2xl p-4 space-y-0.5 shadow-2xs">
          <span className="text-[11px] text-[#3E000C]/60 font-semibold block">Commuters Protected</span>
          <div className="text-2xl font-black text-[#3E000C]">{totalCommutersImpacted.toLocaleString()}</div>
        </div>
      </div>

      {/* Main Grid: Queue & Ward GIS Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#3E000C] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#3E000C]" />
              <span>Prioritized Incident Dispatch Queue</span>
            </h2>
            <span className="text-xs text-[#3E000C]/70 font-medium hidden sm:inline">
              {t("exposureRanked")}
            </span>
          </div>

          <div className="space-y-3">
            {prioritySortedIssues.map((issue) => {
              const isOverdue = issue.slaMinutesRemaining < 0 && issue.status !== "Resolved";
              const isResolved = issue.status === "Resolved";

              return (
                <div
                  key={issue.id}
                  className={`bg-[#FFFFFF]/90 border rounded-2xl p-4 sm:p-5 transition-all shadow-2xs space-y-3.5 ${
                    isOverdue
                      ? "border-red-900/35 bg-red-900/5"
                      : isResolved
                      ? "border-emerald-800/20 bg-emerald-900/5 opacity-80"
                      : "border-[#3E000C]/12 hover:border-[#3E000C]/30"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#3E000C] px-2 py-0.5 rounded bg-[#3E000C]/8 border border-[#3E000C]/12">
                          {issue.trackingId}
                        </span>
                        <span className="text-xs font-bold text-[#3E000C] px-2 py-0.5 rounded-full bg-[#3E000C] text-[#FFECD1]">
                          Sev {issue.severity}/5
                        </span>
                        {issue.isClustered && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-600/15 text-amber-900 border border-amber-600/25 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            <span>Clustered ({issue.confirmationsCount} Citizen Confirmations)</span>
                          </span>
                        )}
                        <span className="text-[10px] text-[#3E000C]/60 font-medium">
                          {issue.location.ward}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-[#3E000C]">{issue.title}</h3>
                      <p className="text-xs text-[#3E000C]/75">{issue.location.address}</p>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <div className="text-xs font-semibold text-[#3E000C]/60">Exposure Index</div>
                      <div className="text-xl font-black text-[#3E000C]">
                        {issue.priorityScore} <span className="text-xs font-normal">pts</span>
                      </div>
                      <div className="text-[10px] text-[#3E000C]/65 font-mono">
                        ({issue.severity} × {issue.exposureCount}) / 100
                      </div>
                    </div>
                  </div>

                  {/* Impact breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-[#FFECD1]/25 border border-[#3E000C]/10 text-xs">
                    <div>
                      <span className="text-[10px] text-[#3E000C]/60 block font-semibold">{t("exposureCount")}:</span>
                      <span className="font-bold text-[#3E000C]">{issue.exposureCount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#3E000C]/60 block font-semibold">{t("slaTimer")}:</span>
                      <span
                        className={`font-bold ${
                          isOverdue ? "text-red-700" : isResolved ? "text-emerald-700" : "text-[#3E000C]"
                        }`}
                      >
                        {issue.slaFormatted}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#3E000C]/60 block font-semibold">Status:</span>
                      <span className="font-bold text-[#3E000C]">{issue.status}</span>
                    </div>
                  </div>

                  {/* Actions: Dispatch or AI Before/After Verification */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#3E000C]/10">
                    {issue.status === "Pending" && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={dispatchingId === issue.id}
                        onClick={() => handleDispatchUnit(issue.id)}
                        leftIcon={<Send className="w-3.5 h-3.5" />}
                      >
                        {dispatchingId === issue.id ? t("assigningSquad") : t("dispatchSquad")}
                      </Button>
                    )}

                    {issue.status === "In Progress" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenVerifyModal(issue)}
                        leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#FFECD1]" />}
                      >
                        {t("verifyResolve")}
                      </Button>
                    )}

                    {issue.status === "Resolved" && (
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

        {/* Right Ward GIS Map (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-3xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#3E000C] uppercase tracking-wider">
                Hyderabad GIS Incident Radar
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#3E000C]/8 text-[#3E000C]">
                {prioritySortedIssues.length} Pins
              </span>
            </div>

            <div className="h-80 rounded-2xl overflow-hidden border border-[#3E000C]/12">
              <DynamicMap
                center={[17.4401, 78.3489]}
                zoom={14}
                markers={wardMapMarkers}
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Before vs After Fix Verification Modal */}
      <AnimatePresence>
        {verifyingIssue && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#FFFFFF] border border-[#3E000C]/20 rounded-3xl p-6 shadow-2xl space-y-5 text-[#3E000C]"
            >
              <div className="flex items-center justify-between border-b border-[#3E000C]/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#3E000C]" />
                  <h3 className="font-bold text-base">Gemini AI Fix Verification</h3>
                </div>
                <button
                  onClick={() => setVerifyingIssue(null)}
                  className="p-1 rounded-lg hover:bg-[#3E000C]/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Before vs After Comparison Photos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#3E000C]/60 block uppercase">
                    Before Repair Photo
                  </span>
                  <div className="h-32 rounded-xl overflow-hidden border border-[#3E000C]/15 bg-black/5">
                    <img
                      src={verifyingIssue.beforePhoto}
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#3E000C]/60 block uppercase">
                    After Repair Proof
                  </span>
                  <div className="h-32 rounded-xl overflow-hidden border border-[#3E000C]/15 bg-black/5">
                    <img
                      src={afterPhotoUrl}
                      alt="After Proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Run AI Verification */}
              {!verificationResult ? (
                <div className="text-center py-2 space-y-3">
                  <p className="text-xs text-[#3E000C]/75">
                    Gemini Vision will cross-examine both photos to ensure the asphalt compaction meets civil safety standards before closing this ticket.
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={isAiVerifying}
                    onClick={handleRunAiVerification}
                    leftIcon={
                      isAiVerifying ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#FFECD1]" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-[#FFECD1]" />
                      )
                    }
                  >
                    {isAiVerifying ? "Auditing with Gemini Vision..." : "Run AI Fix Verification"}
                  </Button>
                </div>
              ) : (
                <div className="bg-[#FFECD1]/35 p-4 rounded-2xl border border-[#3E000C]/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-800" />
                      <span className="text-xs font-bold text-emerald-900">
                        {verificationResult.verdict}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#3E000C]">
                      Confidence: {verificationResult.confidence}%
                    </span>
                  </div>

                  <p className="text-xs text-[#3E000C]/80 leading-relaxed">
                    {verificationResult.civilNotes}
                  </p>

                  <Button
                    variant="primary"
                    size="md"
                    className="w-full mt-2"
                    onClick={handleConfirmResolution}
                    rightIcon={<CheckCircle2 className="w-4 h-4 text-[#FFECD1]" />}
                  >
                    Confirm & Close Ticket in Database
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
