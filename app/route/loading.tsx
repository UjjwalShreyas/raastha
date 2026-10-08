import React from "react";
import { Loader2, Navigation } from "lucide-react";

export default function RouteLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3E000C]/12 pb-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#3E000C]/8 border border-[#3E000C]/15 text-[#3E000C] text-xs font-bold">
            <Navigation className="w-3.5 h-3.5 animate-pulse" />
            <span>OpenRouteService Corridor Pathfinding</span>
          </div>
          <div className="h-7 w-64 bg-[#3E000C]/10 rounded-lg animate-pulse" />
          <div className="h-4 w-96 bg-[#3E000C]/5 rounded-md animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#FFFFFF]/90 border border-[#3E000C]/12 rounded-2xl p-4 space-y-3 shadow-2xs">
            <div className="h-4 w-32 bg-[#3E000C]/10 rounded animate-pulse" />
            <div className="h-10 w-full bg-[#3E000C]/5 rounded-xl animate-pulse" />
            <div className="flex gap-2">
              <div className="h-7 w-24 bg-[#3E000C]/10 rounded-lg animate-pulse" />
              <div className="h-7 w-28 bg-[#3E000C]/10 rounded-lg animate-pulse" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-32 bg-white border border-[#3E000C]/12 rounded-2xl p-4 shadow-2xs animate-pulse" />
            <div className="h-32 bg-white border border-[#3E000C]/12 rounded-2xl p-4 shadow-2xs animate-pulse" />
          </div>
        </div>

        <div className="lg:col-span-7 h-[560px] rounded-3xl bg-[#FFECD1]/30 border border-[#3E000C]/15 flex flex-col items-center justify-center text-[#3E000C] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#3E000C]" />
          <span className="text-xs font-semibold">Initializing Corridor Navigation Map...</span>
        </div>
      </div>
    </div>
  );
}
