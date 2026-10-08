"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mic,
  Camera,
  Navigation,
  ShieldCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  Users,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";

export default function Home() {
  const { t, voice } = useApp();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-16 space-y-12">
      {/* Editorial Minimalist Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-[#FFFFFF]/75 border border-[#3E000C]/12 p-8 sm:p-14 shadow-xs">
        <div className="relative z-10 max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3E000C]/8 border border-[#3E000C]/15 text-[#3E000C] text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3E000C]" />
            <span>Voice-first civic safety & navigation</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#3E000C] leading-tight">
            Speak. Navigate safely. <br className="hidden sm:inline" />
            <span className="opacity-80 font-medium">Fix your city with ease.</span>
          </h1>

          <p className="text-sm sm:text-base text-[#3E000C]/75 font-normal leading-relaxed">
            Report road hazards, potholes and dark spots with natural voice in Hindi, Telugu or English — and navigate AI-verified illuminated corridors.
          </p>

          {/* Clean Voice Command Suggestion Chips */}
          <div className="pt-1 space-y-2">
            <span className="text-[11px] font-semibold text-[#3E000C]/50 uppercase tracking-wider block">
              Suggested voice prompts:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { text: "Report deep pothole on 80 Feet Rd", lang: "EN" },
                { text: "गड्ढे की शिकायत दर्ज करें", lang: "HI" },
                { text: "సురక్షితమైన మార్గం చూపించు", lang: "TE" },
                { text: "Find safest route corridor", lang: "EN" },
              ].map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => voice.speak(cmd.text, cmd.lang)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#3E000C]/5 border border-[#3E000C]/15 text-xs font-medium text-[#3E000C] transition-colors cursor-pointer shadow-2xs"
                >
                  <Mic className="w-3 h-3 text-[#3E000C]" />
                  <span>"{cmd.text}"</span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <Link href="/report">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
                leftIcon={<Camera className="w-4 h-4 text-[#FFECD1]" />}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {t("reportProblem")}
              </Button>
            </Link>

            <Link href="/route">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                leftIcon={<Navigation className="w-4 h-4 text-[#3E000C]" />}
              >
                {t("safeRoute")}
              </Button>
            </Link>

            <Link href="/overview">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                leftIcon={<MapPin className="w-4 h-4 text-[#3E000C]" />}
              >
                Explore Overview Radar
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid (4 Essential Actions) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overview Radar */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-[#FFFFFF]/75 border border-[#3E000C]/12 rounded-2xl p-5 flex flex-col justify-between hover:border-[#3E000C]/30 transition-colors shadow-2xs"
        >
          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3E000C]/8 border border-[#3E000C]/15 flex items-center justify-center text-[#3E000C]">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-sm font-bold text-[#3E000C]">Civic Overview Radar</h3>
            <p className="text-[#3E000C]/70 text-xs leading-relaxed">
              Explore live ward hazard clusters, verified safe corridors, and real-time community reports.
            </p>
          </div>
          <Link href="/overview" className="pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3E000C] hover:underline underline-offset-4">
              Open Overview <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </motion.div>

        {/* Card 2: AI Hazard Reporting */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-[#FFFFFF]/75 border border-[#3E000C]/12 rounded-2xl p-5 flex flex-col justify-between hover:border-[#3E000C]/30 transition-colors shadow-2xs"
        >
          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3E000C]/8 border border-[#3E000C]/15 flex items-center justify-center text-[#3E000C]">
              <Camera className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-sm font-bold text-[#3E000C]">AI Hazard Reporting</h3>
            <p className="text-[#3E000C]/70 text-xs leading-relaxed">
              Snap a photo or speak in local languages. Automated vision analysis estimates depth and commuter impact.
            </p>
          </div>
          <Link href="/report" className="pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3E000C] hover:underline underline-offset-4">
              Report Hazard <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </motion.div>

        {/* Card 3: Safe Corridor Navigation */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-[#FFFFFF]/75 border border-[#3E000C]/12 rounded-2xl p-5 flex flex-col justify-between hover:border-[#3E000C]/30 transition-colors shadow-2xs"
        >
          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3E000C]/8 border border-[#3E000C]/15 flex items-center justify-center text-[#3E000C]">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-sm font-bold text-[#3E000C]">Safe Navigation</h3>
            <p className="text-[#3E000C]/70 text-xs leading-relaxed">
              Real-time routing prioritizing high-LUX streetlight illumination, active CCTV corridors, and avoiding unlit paths.
            </p>
          </div>
          <Link href="/route" className="pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3E000C] hover:underline underline-offset-4">
              Plan Route <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </motion.div>

        {/* Card 4: Official Ward Dispatch */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-[#FFFFFF]/75 border border-[#3E000C]/12 rounded-2xl p-5 flex flex-col justify-between hover:border-[#3E000C]/30 transition-colors shadow-2xs"
        >
          <div className="space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3E000C]/8 border border-[#3E000C]/15 flex items-center justify-center text-[#3E000C]">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-sm font-bold text-[#3E000C]">Ward Command Portal</h3>
            <p className="text-[#3E000C]/70 text-xs leading-relaxed">
              Exposure-weighted priority queue ranking repairs by community impact with live before/after verification.
            </p>
          </div>
          <Link href="/admin" className="pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3E000C] hover:underline underline-offset-4">
              Official Portal <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </motion.div>
      </section>

      {/* Metrics Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Daily Commuters Protected", value: "14,800+", icon: Users },
          { label: "Dark Spots Lit / Resolved", value: "142 Spots", icon: CheckCircle2 },
          { label: "Avg SLA Repair Resolution", value: "4.2 Hours", icon: Clock },
          { label: "Safe Corridor Rating", value: "98.4%", icon: ShieldCheck },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-[#FFFFFF]/75 border border-[#3E000C]/12 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs"
            >
              <div className="p-2.5 rounded-xl bg-[#3E000C]/8 border border-[#3E000C]/12 text-[#3E000C]">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xl font-black text-[#3E000C]">{stat.value}</div>
                <div className="text-[11px] text-[#3E000C]/65 font-medium">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
