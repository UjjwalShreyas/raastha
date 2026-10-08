"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  Send,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { DynamicMap } from "@/components/map/DynamicMap";
import { Button } from "@/components/ui/Button";

export default function AdminWardPortalPage() {
  const { issues, updateIssueStatus, t } = useApp();

  const [selectedWard, setSelectedWard] = useState<string>("All Wards");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Types");
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const filteredIssues = issues.filter((iss) => {
    if (selectedWard !== "All Wards" && !iss.location.ward.includes(selectedWard)) {
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

  const handleDispatchUnit = (id: string) => {
    setDispatchingId(id);
    setTimeout(() => {
      updateIssueStatus(id, "In Progress");
      setDispatchingId(null);
    }, 700);
  };

  const handleMarkResolved = (id: string) => {
    updateIssueStatus(
      id,
      "Resolved",
      "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=80",
      "Ward engineering response unit completed surface repair."
    );
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
    description: `Priority Score: ${i.priorityScore} (${i.exposureCount} commuters)`,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Portal Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3E000C]/12 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#3E000C]/8 border border-[#3E000C]/15 text-[#3E000C] text-xs font-medium mb-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>Ward Engineering Command</span>
          </div>
          <h1 className="text-2xl font-bold text-[#3E000C]">
            Exposure Priority Dispatch
          </h1>
          <p className="text-[#3E000C]/65 text-xs mt-0.5">
            Auto-ranked queue based on community exposure impact formula: (Severity × Commuters) / 100
          </p>
        </div>

        {/* Minimal Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="bg-white border border-[#3E000C]/15 rounded-xl px-3 py-1.5 text-xs font-medium text-[#3E000C] focus:outline-none focus:border-[#3E000C]/50 cursor-pointer shadow-2xs"
          >
            <option value="All Wards">All Wards (Koramangala/Ejipura)</option>
            <option value="Ward 151">Ward 151 - Koramangala</option>
            <option value="Ward 150">Ward 150 - Ejipura</option>
            <option value="Ward 152">Ward 152 - Madiwala</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-[#3E000C]/15 rounded-xl px-3 py-1.5 text-xs font-medium text-[#3E000C] focus:outline-none focus:border-[#3E000C]/50 cursor-pointer shadow-2xs"
          >
            <option value="All Types">All Hazard Types</option>
            <option value="Pothole">Potholes</option>
            <option value="Broken Streetlight">Streetlights</option>
            <option value="Open Manhole">Manholes</option>
            <option value="Waterlogging">Waterlogging</option>
          </select>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#FFFFFF]/80 border border-[#3E000C]/12 rounded-2xl p-4 space-y-0.5 shadow-2xs">
          <span className="text-[11px] text-[#3E000C]/60 font-medium block">Total Reports</span>
          <div className="text-2xl font-black text-[#3E000C]">{totalReported}</div>
        </div>
        <div className="bg-[#FFFFFF]/80 border border-[#3E000C]/12 rounded-2xl p-4 space-y-0.5 shadow-2xs">
          <span className="text-[11px] text-rose-800 font-semibold block">SLA Overdue</span>
          <div className="text-2xl font-black text-rose-800 underline decoration-rose-300">{overdueCount}</div>
        </div>
        <div className="bg-[#FFFFFF]/80 border border-[#3E000C]/12 rounded-2xl p-4 space-y-0.5 shadow-2xs">
          <span className="text-[11px] text-[#3E000C]/60 font-medium block">Units Dispatched</span>
          <div className="text-2xl font-black text-[#3E000C]">{inProgressCount}</div>
        </div>
        <div className="bg-[#FFFFFF]/80 border border-[#3E000C]/12 rounded-2xl p-4 space-y-0.5 shadow-2xs">
          <span className="text-[11px] text-[#3E000C]/60 font-medium block">Commuters Protected</span>
          <div className="text-2xl font-black text-[#3E000C]">{totalCommutersImpacted.toLocaleString()}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#3E000C] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#3E000C]" />
              <span>Priority Dispatch Queue</span>
            </h2>
            <span className="text-[11px] text-[#3E000C]/60">Highest Risk First</span>
          </div>

          <div className="space-y-3">
            {prioritySortedIssues.map((issue, idx) => (
              <motion.div
                key={issue.id}
                layout
                className="bg-[#FFFFFF]/85 border border-[#3E000C]/12 rounded-2xl p-4 hover:border-[#3E000C]/35 transition-colors space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-[#3E000C]/8 border border-[#3E000C]/15 text-[#3E000C] font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#3E000C]/60">{issue.trackingId}</span>
                        <h3 className="font-semibold text-[#3E000C] text-sm">{issue.title}</h3>
                      </div>
                      <p className="text-[11px] text-[#3E000C]/65 mt-0.5">{issue.location.address}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-[#3E000C]">
                      {issue.priorityScore} <span className="text-[10px] font-normal text-[#3E000C]/60">pts</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FFECD1]/20 p-2.5 rounded-xl border border-[#3E000C]/10 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[#3E000C]/60 text-[10px] block">Severity</span>
                    <span className="font-semibold text-[#3E000C]">{issue.severity} / 5</span>
                  </div>
                  <div>
                    <span className="text-[#3E000C]/60 text-[10px] block">Exposure</span>
                    <span className="font-semibold text-[#3E000C]">{issue.exposureCount}</span>
                  </div>
                  <div>
                    <span className="text-[#3E000C]/60 text-[10px] block">SLA</span>
                    <span className={issue.slaMinutesRemaining < 0 ? "font-bold text-rose-800" : "font-semibold text-[#3E000C]"}>
                      {issue.slaFormatted}
                    </span>
                  </div>
                </div>

                {/* Dispatch Controls */}
                <div className="flex items-center justify-between pt-0.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      issue.status === "Resolved"
                        ? "bg-[#3E000C] text-[#FFECD1] border-[#3E000C]"
                        : issue.status === "In Progress"
                        ? "bg-[#3E000C]/12 text-[#3E000C] border-[#3E000C]/25"
                        : "bg-[#3E000C]/6 text-[#3E000C] border-[#3E000C]/15"
                    }`}
                  >
                    {issue.status}
                  </span>

                  <div className="flex items-center gap-2">
                    {issue.status === "Pending" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={dispatchingId === issue.id}
                        onClick={() => handleDispatchUnit(issue.id)}
                        leftIcon={<Send className="w-3.5 h-3.5" />}
                      >
                        Dispatch Unit
                      </Button>
                    )}

                    {issue.status === "In Progress" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleMarkResolved(issue.id)}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-[#FFECD1]" />}
                      >
                        Mark Fixed
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Map (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="h-[480px] rounded-2xl overflow-hidden border border-[#3E000C]/15 shadow-sm bg-white">
            <DynamicMap
              center={[12.9352, 77.6245]}
              zoom={14}
              markers={wardMapMarkers}
            />
          </div>

          <div className="bg-[#FFFFFF]/80 border border-[#3E000C]/12 rounded-xl p-3 text-xs text-[#3E000C]/75 space-y-1 shadow-2xs">
            <div className="font-medium text-[#3E000C] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#3E000C]" />
              <span>Ward Rapid Repair Protocol</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#3E000C]/70">
              High exposure hazards (Exposure {">"} 3,000 commuters daily) automatically trigger expedited ward engineer dispatch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
