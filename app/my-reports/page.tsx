"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { HazardIssue } from "@/lib/mockData";
import { Button } from "@/components/ui/Button";

export default function MyReportsPage() {
  const { citizenHistory, updateIssueStatus, t } = useApp();

  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "In Progress" | "Resolved">("All");
  const [verifyingIssue, setVerifyingIssue] = useState<HazardIssue | null>(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string>("");
  const [resolutionNotes, setResolutionNotes] = useState<string>("");

  const filteredIssues = citizenHistory.filter((issue) => {
    if (filterStatus === "All") return true;
    return issue.status === filterStatus;
  });

  const handleConfirmFix = () => {
    if (!verifyingIssue) return;

    updateIssueStatus(
      verifyingIssue.id,
      "Resolved",
      afterPhotoUrl || "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=80",
      resolutionNotes || "Fix verified by reporting citizen."
    );

    setVerifyingIssue(null);
    setAfterPhotoUrl("");
    setResolutionNotes("");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3E000C]/12 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#3E000C] flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-[#3E000C]" />
            <span>My Reported Issues</span>
          </h1>
          <p className="text-[#3E000C]/65 text-xs mt-1">
            Track resolution status, SLA deadlines and verify completed fixes
          </p>
        </div>

        {/* Minimalist Filter Tabs */}
        <div className="flex items-center bg-[#FFFFFF]/80 border border-[#3E000C]/15 p-0.5 rounded-xl text-xs shadow-2xs">
          {(["All", "Pending", "In Progress", "Resolved"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filterStatus === st
                  ? "bg-[#3E000C] text-[#FFECD1] font-semibold"
                  : "text-[#3E000C]/70 hover:text-[#3E000C]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3.5">
        {filteredIssues.length === 0 ? (
          <div className="bg-[#FFFFFF]/75 border border-[#3E000C]/12 rounded-2xl p-12 text-center text-[#3E000C]/60 space-y-2 shadow-2xs">
            <FileText className="w-10 h-10 text-[#3E000C]/40 mx-auto" />
            <h3 className="text-sm font-semibold text-[#3E000C]">No reports found</h3>
            <p className="text-xs text-[#3E000C]/60">No hazard reports matching this filter.</p>
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
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[11px] text-[#3E000C]/70 px-2 py-0.5 rounded bg-[#3E000C]/8 border border-[#3E000C]/15">
                    {issue.trackingId}
                  </span>
                  <h3 className="text-sm font-semibold text-[#3E000C]">{issue.title}</h3>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                      issue.status === "Resolved"
                        ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C]"
                        : issue.status === "In Progress"
                        ? "bg-[#3E000C]/12 text-[#3E000C] border-[#3E000C]/25"
                        : "bg-[#3E000C]/6 text-[#3E000C] border-[#3E000C]/15"
                    }`}
                  >
                    {issue.status}
                  </span>

                  <span className="text-[11px] text-[#3E000C]/70 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#3E000C]/60" />
                    SLA: {issue.slaFormatted}
                  </span>
                </div>
              </div>

              {/* Main Info */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {/* Before / After Photos */}
                <div className="md:col-span-5 flex gap-2.5">
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-[#3E000C]/60 uppercase font-medium block">
                      Before
                    </span>
                    <div className="h-28 rounded-xl overflow-hidden border border-[#3E000C]/15">
                      <img
                        src={issue.beforePhoto}
                        alt="Before hazard"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {issue.afterPhoto ? (
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-[#3E000C] uppercase font-bold block">
                        After
                      </span>
                      <div className="h-28 rounded-xl overflow-hidden border border-[#3E000C]/35">
                        <img
                          src={issue.afterPhoto}
                          alt="After fix"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-[#3E000C]/50 uppercase font-medium block">
                        After
                      </span>
                      <div className="h-28 rounded-xl bg-[#FFECD1]/40 border border-dashed border-[#3E000C]/20 flex flex-col items-center justify-center text-[#3E000C]/60 p-2 text-center">
                        <Clock className="w-5 h-5 mb-1 text-[#3E000C]/40" />
                        <span className="text-[10px]">Awaiting repair</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Details */}
                <div className="md:col-span-7 space-y-2.5">
                  <div className="bg-[#FFECD1]/20 p-3 rounded-xl border border-[#3E000C]/10 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[#3E000C]">
                      <span className="font-medium">{issue.location.address}</span>
                      <span className="text-[#3E000C]/60">{issue.location.ward}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#3E000C]/70 pt-1">
                      <span>AI: <strong className="text-[#3E000C] font-semibold">{issue.aiClassification.detectedObject}</strong></span>
                      <span>Commuters: <strong className="text-[#3E000C] font-semibold">{issue.exposureCount}</strong></span>
                    </div>

                    {issue.resolutionNotes && (
                      <div className="text-[11px] text-[#3E000C] pt-1 mt-1 border-t border-[#3E000C]/10">
                        Note: {issue.resolutionNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[11px] text-[#3E000C]/60">
                      Reported: {issue.reportedAt} | Priority: {issue.priorityScore} pts
                    </span>

                    {issue.status !== "Resolved" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setVerifyingIssue(issue)}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Verify Fix
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Fix Verification Modal */}
      <AnimatePresence>
        {verifyingIssue && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md bg-white border border-[#3E000C]/20 rounded-2xl p-6 space-y-4 shadow-xl text-[#3E000C]"
            >
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#3E000C]">
                  Verify Repair for {verifyingIssue.trackingId}
                </h3>
                <p className="text-xs text-[#3E000C]/65">
                  Confirm hazard repair and enter optional resolution notes.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#3E000C]/75 block">
                    After Photo URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://... (or leave blank for default)"
                    value={afterPhotoUrl}
                    onChange={(e) => setAfterPhotoUrl(e.target.value)}
                    className="w-full bg-[#FFECD1]/20 border border-[#3E000C]/20 rounded-xl p-2.5 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#3E000C]/75 block">
                    Verification Notes
                  </label>
                  <textarea
                    placeholder="e.g. Pothole filled and leveled, road surface smooth."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full bg-[#FFECD1]/20 border border-[#3E000C]/20 rounded-xl p-2.5 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]/50 h-16 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={handleConfirmFix}
                >
                  Confirm & Close Issue
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setVerifyingIssue(null)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
