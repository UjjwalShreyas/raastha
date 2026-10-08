"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2, UserCheck, ShieldCheck, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

const OFFICIAL_ROLES = [
  {
    title: "Zonal Commissioner (GHMC)",
    email: "zonal.commissioner@ghmc.gov.in",
    name: "Srikanth Reddy, IAS",
    department: "Greater Hyderabad Municipal Corporation",
    designation: "Zonal Commissioner (Cyberabad & Serilingampally)",
  },
  {
    title: "Principal Secretary (State Official)",
    email: "principal.secretary@telangana.gov.in",
    name: "Dr. K. Srinivas Rao, IAS",
    department: "Dept of Municipal Administration & Urban Development (MA&UD)",
    designation: "Principal Secretary to State Government",
  },
  {
    title: "Chief Engineer (Roads & Buildings)",
    email: "chief.engineer@telangana.gov.in",
    name: "Er. V. Narayana Murthy",
    department: "State Roads & Buildings Department (R&B)",
    designation: "Chief Engineer (State Highways & Infrastructure)",
  },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const { t, showToast } = useApp();
  const { isAuthorityAuthenticated, isLoading, authorityLogin, setAppMode } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [designation, setDesignation] = useState<string>("Executive Engineer");
  const [department, setDepartment] = useState<string>("GHMC Municipal Administration");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Already signed in: go straight to the dashboard
  useEffect(() => {
    if (!isLoading && isAuthorityAuthenticated) {
      router.replace("/admin");
    }
  }, [isLoading, isAuthorityAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);

    const { error } = await authorityLogin(email.trim(), password, designation, department);
    if (error) {
      setErrorMsg(error);
      setSubmitting(false);
      return;
    }
    setAppMode("authority");
    showToast("Authority access verified. Entering Municipal Command Portal.");
    router.replace("/admin");
    setSubmitting(false);
  };

  const handleQuickOfficialLogin = async (official: typeof OFFICIAL_ROLES[0]) => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await authorityLogin(official.email, "raastha@123", official.designation, official.department);
      setAppMode("authority");
      showToast(`Welcome, ${official.name} (${official.title})`);
      router.replace("/admin");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 font-sans space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/95 border border-[#3E000C]/15 rounded-3xl p-6 sm:p-8 shadow-md space-y-6 text-[#3E000C]"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#3E000C] text-[#FFECD1] flex items-center justify-center mx-auto shadow-sm">
            <Building2 className="w-6 h-6 text-[#FFECD1]" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#3E000C]/8 text-[#3E000C] text-[11px] font-bold tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3E000C]" />
            <span>State &amp; Municipal Authority Gateway</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3E000C]">
            Official Authority Command Login
          </h1>
          <p className="text-xs text-[#3E000C]/70 font-normal">
            Restricted to Municipal Engineers, Ward Commissioners, and State Higher Officials. Receives real-time Gemini AI hazard diagnoses and exposure dispatch queues.
          </p>
        </div>

        {/* 1-Click State Higher Official & Commissioner Selection */}
        <div className="bg-[#FFECD1]/30 border border-[#3E000C]/12 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#3E000C] uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#3E000C]" />
              <span>1-Click Official Evaluation Access</span>
            </span>
            <span className="text-[10px] text-[#3E000C]/60 font-semibold">Demo Delegations</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {OFFICIAL_ROLES.map((official, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickOfficialLogin(official)}
                className="w-full p-3 rounded-xl border border-[#3E000C]/15 bg-white hover:bg-[#FFECD1]/40 text-left transition-all cursor-pointer shadow-2xs flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-[#3E000C] group-hover:text-red-950 flex items-center gap-1.5">
                    <span>{official.title}</span>
                    <span className="text-[10px] font-normal text-[#3E000C]/70">({official.name})</span>
                  </div>
                  <div className="text-[10px] text-[#3E000C]/65 truncate">{official.department}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#3E000C]/40 group-hover:text-[#3E000C] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Custom Official Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 border-t border-[#3E000C]/10 pt-4">
          <div className="text-[11px] font-bold text-[#3E000C]/70 uppercase tracking-wider block">
            Or Sign In with Official Department Credentials
          </div>

          <div className="space-y-1">
            <label
              htmlFor="admin-email"
              className="text-[11px] font-semibold text-[#3E000C]/70 block"
            >
              Official Gov Email / ID
            </label>
            <div className="relative">
              <input
                id="admin-email"
                type="email"
                required
                placeholder="officer.name@ghmc.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#FFECD1]/20 border border-[#3E000C]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]"
              />
              <Mail className="w-4 h-4 text-[#3E000C]/50 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="admin-password"
              className="text-[11px] font-semibold text-[#3E000C]/70 block"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#FFECD1]/20 border border-[#3E000C]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]"
              />
              <Lock className="w-4 h-4 text-[#3E000C]/50 absolute left-3 top-2.5" />
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="text-xs text-red-800 bg-red-100/80 border border-red-300 p-2.5 rounded-xl font-medium"
            >
              {errorMsg}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full font-bold"
            disabled={submitting || !email || !password}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {submitting ? "Authenticating Authority..." : "Access State Command Dashboard"}
          </Button>
        </form>

        {/* Back to Citizen Flow */}
        <div className="pt-3 border-t border-[#3E000C]/10 text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-[#3E000C]/70 underline hover:text-[#3E000C]"
          >
            Switch to Citizen Portal Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
