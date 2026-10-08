"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Loader2 } from "lucide-react";
import type { MapProps } from "./LeafletInnerMap";

// Dynamic import with SSR disabled to prevent Leaflet 'window is not defined' errors
const LeafletMap = dynamic(() => import("./LeafletInnerMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[350px] bg-[#FFECD1]/40 border border-[#3E000C]/15 rounded-2xl flex flex-col items-center justify-center text-[#3E000C] gap-3">
      <Loader2 className="w-7 h-7 animate-spin text-[#3E000C]" />
      <span className="text-xs font-semibold">Loading Civic Safety Map tiles...</span>
    </div>
  ),
});

export function DynamicMap(props: MapProps) {
  return <LeafletMap {...props} />;
}

export default DynamicMap;
