"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Loader2 } from "lucide-react";
import type { MapProps } from "./LeafletInnerMap";

// Dynamic import with SSR disabled to prevent Leaflet 'window is not defined' errors
const LeafletMap = dynamic(() => import("./LeafletInnerMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[350px] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <span className="text-sm font-medium">Loading Civic Safety Map tiles...</span>
    </div>
  ),
});

export function DynamicMap(props: MapProps) {
  return <LeafletMap {...props} />;
}

export default DynamicMap;
