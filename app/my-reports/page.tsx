"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  Trash2,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useIssues, Issue } from "@/context/IssuesContext";
import { Button } from "@/components/ui/Button";

export default function MyReportsPage() {
  const { t, showToast } = useApp();
  const { issues, isConfigured, deleteIssue } = useIssues();

  const [filterStatus, setFilterStatus] = useState<"All" | "reported" | "in_progress" | "resolved">("All");
  const [confirmDeleteIssue, setConfirmDeleteIssue] = useState<Issue | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const filteredIssues = issues.filter((issue) => {
    if (filterStatus === "All") return true;
    if (filterStatus === "in_progress") {
      return issue.status === "dispatched" || issue.status === "in_progress";
    }
    return issue.status === filterStatus;
  });

  const handleDelete = async (issue: Issue) => {
    setIsDeleting(true);
    try {
      await deleteIssue(issue.id);
      showToast(`Report #${issue.tracking_id} deleted successfully`);
      setConfirmDeleteIssue(null);
    } catch (err: any) {
      showToast(`Failed to delete: ${err.message || "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3E000C]/12 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#3E000C] flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-[#3E000C]" />
            <span>My Reported Issues & Proofs</span>
          </h1>
          <p className="text-[#3E000C]/65 text-xs mt-1">
            Live database sync: track dispatch squads and AI Before/After verified repair proofs
          </p>
        </div>

        {/* Minimalist Filter Tabs */}
        <div className="flex items-center bg-[#FFFFFF]/80 border border-[#3E000C]/15 p-0.5 rounded-xl text-xs shadow-2xs">
          {[
            { id: "All", label: "All" },
            { id: "reported", label: "Reported" },
            { id: "in_progress", label: "In Progress" },
            { id: "resolved", label: "Resolved" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-[#3E000C] text-[#FFECD1] font-semibold"
                  : "text-[#3E000C]/70 hover:text-[#3E000C]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!isConfigured && (
        <div className="bg-amber-100/90 border border-amber-300 text-amber-900 rounded-2xl p-3.5 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Backend Notice:</strong> Supabase credentials not detected in <code>.env.local</code>. Running in local browser demo mode.
          </span>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-3.5">
        {filteredIssues.length === 0 ? (
          <div className="bg-[#FFFFFF]/75 border border-[#3E000C]/12 rounded-2xl p-12 text-center text-[#3E000C]/60 space-y-2 shadow-2xs">
            <FileText className="w-10 h-10 text-[#3E000C]/40 mx-auto" />
            <h3 className="text-sm font-semibold text-[#3E000C]">No reports found</h3>
            <p className="text-xs text-[#3E000C]/60">Submit a hazard report from the Report page to see live updates.</p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <motion.div
              key={issue.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-2xl p-5 hover:border-[#3E000C]/35 transition-colors space-y-4 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#3E000C]/10">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-bold text-[#3E000C] px-2 py-0.5 rounded bg-[#3E000C]/8 border border-[#3E000C]/12">
                    {issue.tracking_id}
                  </span>
                  {issue.is_sample || issue.tracking_id.startsWith("SAMPLE-") ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                      {t("sampleDataBadge")}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {t("liveReportBadge")}
                    </span>
                  )}
                  <span className="text-xs font-bold text-[#3E000C] px-2 py-0.5 rounded-full bg-[#3E000C] text-[#FFECD1]">
                    Sev {issue.severity}/5
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#3E000C]/8 text-[#3E000C]">
                    {issue.type}
                  </span>
                  <h3 className="text-sm font-semibold text-[#3E000C]">
                    {issue.description || `${issue.type} on ${issue.ward}`}
                  </h3>
                </div>

                {/* Status Badge & Delete Action */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase border ${
                      issue.status === "resolved"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : issue.status === "dispatched" || issue.status === "in_progress"
                        ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C]"
                        : "bg-[#3E000C]/8 text-[#3E000C] border-[#3E000C]/15"
                    }`}
                  >
                    {issue.status.replace("_", " ")}
                  </span>

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteIssue(issue)}
                    title="Delete this report"
                    aria-label={`Delete report ${issue.tracking_id}`}
                    className="p-1.5 rounded-lg text-[#3E000C]/50 hover:text-red-700 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Info */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {/* Before / After Photos */}
                <div className="md:col-span-5 flex gap-2.5">
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-[#3E000C]/60 uppercase font-bold block">
                      Before (Reported)
                    </span>
                    <div className="h-28 rounded-xl overflow-hidden border border-[#3E000C]/15 bg-black/5">
                      <img
                        src={issue.photo_url}
                        alt="Before hazard"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {issue.after_photo_url ? (
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                        After (Repaired)
                      </span>
                      <div className="h-28 rounded-xl overflow-hidden border border-emerald-400">
                        <img
                          src={issue.after_photo_url}
                          alt="After fix"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-[#3E000C]/50 uppercase font-semibold block">
                        After Proof
                      </span>
                      <div className="h-28 rounded-xl bg-[#FFECD1]/40 border border-dashed border-[#3E000C]/20 flex flex-col items-center justify-center text-[#3E000C]/60 p-2 text-center">
                        <Clock className="w-5 h-5 mb-1 text-[#3E000C]/40" />
                        <span className="text-[10px] font-medium">Awaiting repair</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Details */}
                <div className="md:col-span-7 space-y-2.5">
                  <div className="bg-[#FFECD1]/20 p-3 rounded-xl border border-[#3E000C]/10 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[#3E000C]">
                      <span className="font-semibold">{issue.ward || "Circle 20 - Serilingampally, Hyderabad"}</span>
                      <span className="text-[#3E000C]/60 font-mono text-[11px]" suppressHydrationWarning>
                        {new Date(issue.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {issue.ai_summary && (
                      <div className="text-[11px] text-[#3E000C]/80 pt-1">
                        <strong>AI Summary:</strong> {issue.ai_summary}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteIssue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#3E000C]/20 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 text-red-700">
                  <div className="p-2 rounded-xl bg-red-100">
                    <AlertCircle className="w-5 h-5 text-red-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#3E000C]">Delete Report</h3>
                    <p className="text-[11px] text-[#3E000C]/60 font-mono">
                      #{confirmDeleteIssue.tracking_id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmDeleteIssue(null)}
                  disabled={isDeleting}
                  className="p-1 rounded-lg text-[#3E000C]/40 hover:text-[#3E000C] hover:bg-[#3E000C]/8 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#3E000C]/80 leading-relaxed">
                Are you sure you want to delete this hazard report? This ticket will be permanently removed from your active tracking feed.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#3E000C]/10">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => setConfirmDeleteIssue(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => handleDelete(confirmDeleteIssue)}
                  leftIcon={
                    isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {isDeleting ? "Deleting..." : "Delete Report"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
