"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Users,
  TrendingUp,
} from "lucide-react";
import { useIssues } from "@/context/IssuesContext";
import { useApp } from "@/context/AppContext";
import { DynamicMap } from "@/components/map/DynamicMap";
import { MOCK_BASE_COORDINATES, MOCK_ROUTES } from "@/lib/mockData";
import { Button } from "@/components/ui/Button";

export default function OverviewPage() {
  const { t } = useApp();
  const { issues } = useIssues();
  const [activeTab, setActiveTab] = useState<"overview" | "hazards" | "corridor">("overview");

  const mapMarkers = issues.map((iss) => ({
    id: iss.id,
    lat: iss.lat,
    lng: iss.lng,
    title: iss.description || `${iss.type} on ${iss.ward}`,
    type: iss.type,
    severity: iss.severity,
    description: `Tracking: ${iss.tracking_id} | Status: ${iss.status}`,
  }));

  const mapPolylines = [
    {
      positions: MOCK_ROUTES[1].coordinates,
      color: "#3E000C", // Chocolate
      name: "Safest Lit Corridor (Score: 88/100)",
      weight: 5,
    },
    {
      positions: MOCK_ROUTES[0].coordinates,
      color: "rgba(62, 0, 12, 0.45)", // Muted Chocolate dashed
      name: "Fastest Route (Passes Dark Spots)",
      weight: 3,
      dashArray: "6, 6",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-sans">
      {/* Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3E000C]/12 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#3E000C]/8 border border-[#3E000C]/15 text-[#3E000C] text-xs font-semibold mb-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>Civic Ward Radar</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#3E000C]">
            Ward Safety Radar & Live Overview
          </h1>
          <p className="text-[#3E000C]/65 text-xs mt-1 font-normal">
            Real-time hazard markers, community reports and illuminated safe corridors around Hyderabad IT Corridor
          </p>
        </div>

        {/* Minimalist Filter Tabs */}
        <div className="flex items-center bg-[#FFFFFF]/80 border border-[#3E000C]/15 p-0.5 rounded-xl text-xs shadow-2xs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#3E000C] text-[#FFECD1] font-semibold"
                : "text-[#3E000C]/70 hover:text-[#3E000C]"
            }`}
          >
            All Markers ({mapMarkers.length})
          </button>
          <button
            onClick={() => setActiveTab("hazards")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === "hazards"
                ? "bg-[#3E000C] text-[#FFECD1] font-semibold"
                : "text-[#3E000C]/70 hover:text-[#3E000C]"
            }`}
          >
            High Severity
          </button>
          <button
            onClick={() => setActiveTab("corridor")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === "corridor"
                ? "bg-[#3E000C] text-[#FFECD1] font-semibold"
                : "text-[#3E000C]/70 hover:text-[#3E000C]"
            }`}
          >
            Safe Corridor
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Map & Live Hazard Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Container (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="h-[480px] rounded-2xl overflow-hidden border border-[#3E000C]/15 shadow-sm bg-white">
            <DynamicMap
              center={MOCK_BASE_COORDINATES}
              zoom={14}
              markers={
                activeTab === "hazards"
                  ? mapMarkers.filter((m) => m.severity && m.severity >= 4)
                  : mapMarkers
              }
              polylines={activeTab === "corridor" ? mapPolylines : [mapPolylines[0]]}
            />
          </div>

          <div className="bg-[#FFFFFF]/80 border border-[#3E000C]/12 rounded-xl p-3 flex items-center justify-between text-xs text-[#3E000C]/75 shadow-2xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3E000C]" />
                <span className="text-[#3E000C] font-semibold">Safest Lit Corridor</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3E000C]/40" />
                <span className="text-[#3E000C]/60">Alternative Route</span>
              </span>
            </div>
            <span className="text-[11px] text-[#3E000C]/50">Default map tiles</span>
          </div>
        </div>

        {/* Priority Feed Sidebar (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#3E000C] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#3E000C]" />
              <span>Priority Civic Issues</span>
            </h2>
            <span className="text-[11px] text-[#3E000C]/50">Ranked by Exposure</span>
          </div>

          <div className="space-y-2.5">
            {issues.slice(0, 4).map((issue) => (
              <div
                key={issue.id}
                className="bg-[#FFFFFF]/80 border border-[#3E000C]/12 rounded-xl p-3.5 space-y-2 hover:border-[#3E000C]/30 transition-colors shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] text-[#3E000C]/60 block">{issue.tracking_id}</span>
                      {issue.is_sample || issue.tracking_id.startsWith("SAMPLE-") ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                          {t("sampleDataBadge")}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {t("liveReportBadge")}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-[#3E000C] line-clamp-1 mt-0.5">
                      {issue.description || `${issue.type} on ${issue.ward || "Road"}`}
                    </h4>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#3E000C]/8 text-[#3E000C] shrink-0 border border-[#3E000C]/15">
                    Sev {issue.severity}/5
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#3E000C]/65 pt-1 border-t border-[#3E000C]/8">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#3E000C]/60" />
                    3,500 Commuters
                  </span>
                  <span className="flex items-center gap-1 text-[#3E000C] font-semibold capitalize">
                    <Clock className="w-3 h-3" />
                    {issue.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1 flex gap-2">
            <Link href="/report" className="flex-1">
              <Button variant="primary" size="sm" className="w-full text-xs">
                {t("reportProblem")}
              </Button>
            </Link>
            <Link href="/my-reports" className="flex-1">
              <Button variant="secondary" size="sm" className="w-full text-xs">
                {t("myReports")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
