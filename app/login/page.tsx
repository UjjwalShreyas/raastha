"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Lock, Mail, Phone, Compass, ArrowRight, ShieldCheck, Building2, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";

export default function CitizenLoginPage() {
  const router = useRouter();
  const { citizen, isCitizenAuthenticated, citizenLogin, setAppMode } = useAuth();
  const { showToast } = useApp();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && mode === "register") {
      alert("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      alert("Please enter your email address.");
      return;
    }
    if (!password.trim()) {
      alert("Please enter a password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalName = name.trim() || email.split("@")[0].replace(/[._]/g, " ");
      await citizenLogin(finalName, email.trim(), password, phone.trim());
      setAppMode("citizen");
      showToast(`Welcome back, ${finalName}! Citizen account active.`);
      router.push("/report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoCitizen = async (demoName: string, demoEmail: string, demoPhone: string) => {
    setIsSubmitting(true);
    try {
      await citizenLogin(demoName, demoEmail, "raastha123", demoPhone);
      setAppMode("citizen");
      showToast(`Signed in as ${demoName}`);
      router.push("/report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12 font-sans space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/95 border border-[#3E000C]/15 rounded-3xl p-6 sm:p-8 shadow-md space-y-6 text-[#3E000C]"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#3E000C] text-[#FFECD1] flex items-center justify-center mx-auto shadow-sm">
            <Compass className="w-6 h-6 text-[#FFECD1]" />
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#3E000C]/8 text-[#3E000C] text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3 text-[#3E000C]" />
            <span>Citizen Civic Safety Portal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3E000C]">
            {mode === "login" ? "Citizen Sign In" : "Register Citizen Account"}
          </h1>
          <p className="text-xs text-[#3E000C]/70 font-normal">
            Report road hazards, track civic repair timelines, and navigate safe streetlit corridors in your city.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-[#FFECD1]/40 p-1 rounded-xl border border-[#3E000C]/12 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === "login"
                ? "bg-[#3E000C] text-[#FFECD1] shadow-2xs"
                : "text-[#3E000C]/70 hover:text-[#3E000C]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === "register"
                ? "bg-[#3E000C] text-[#FFECD1] shadow-2xs"
                : "text-[#3E000C]/70 hover:text-[#3E000C]"
            }`}
          >
            New Citizen Sign Up
          </button>
        </div>

        {/* Citizen Login / Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1">
              <label
                htmlFor="citizen-name"
                className="text-[11px] font-bold text-[#3E000C]/70 uppercase tracking-wider block"
              >
                Full Name
              </label>
              <div className="relative">
                <input
                  id="citizen-name"
                  type="text"
                  required
                  placeholder="e.g. Ananya Rao"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#FFECD1]/20 border border-[#3E000C]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]"
                />
                <User className="w-4 h-4 text-[#3E000C]/50 absolute left-3 top-2.5" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="citizen-email"
              className="text-[11px] font-bold text-[#3E000C]/70 uppercase tracking-wider block"
            >
              Email Address
            </label>
            <div className="relative">
              <input
                id="citizen-email"
                type="email"
                required
                placeholder="citizen@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#FFECD1]/20 border border-[#3E000C]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]"
              />
              <Mail className="w-4 h-4 text-[#3E000C]/50 absolute left-3 top-2.5" />
            </div>
          </div>

          {mode === "register" && (
            <div className="space-y-1">
              <label
                htmlFor="citizen-phone"
                className="text-[11px] font-bold text-[#3E000C]/70 uppercase tracking-wider block"
              >
                Mobile Number (for SMS &amp; SOS alerts)
              </label>
              <div className="relative">
                <input
                  id="citizen-phone"
                  type="tel"
                  placeholder="+91 98480 22338"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#FFECD1]/20 border border-[#3E000C]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]"
                />
                <Phone className="w-4 h-4 text-[#3E000C]/50 absolute left-3 top-2.5" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="citizen-password"
              className="text-[11px] font-bold text-[#3E000C]/70 uppercase tracking-wider block"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="citizen-password"
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

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full font-bold"
            disabled={isSubmitting}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {isSubmitting ? "Signing in..." : mode === "login" ? "Sign In as Citizen" : "Create Citizen Account"}
          </Button>
        </form>

        {/* 1-Click Quick Demo Citizens */}
        <div className="space-y-2 pt-2 border-t border-[#3E000C]/10">
          <span className="text-[10px] font-bold text-[#3E000C]/60 uppercase tracking-wider block text-center">
            Or test with 1-click citizen demo profile:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoCitizen("Ananya Rao", "ananya.rao@gmail.com", "+91 98480 11223")}
              className="p-2.5 rounded-xl border border-[#3E000C]/15 bg-[#FFECD1]/30 hover:bg-[#FFECD1]/70 text-left transition-all cursor-pointer shadow-2xs"
            >
              <div className="font-bold text-xs text-[#3E000C]">Ananya Rao</div>
              <div className="text-[10px] text-[#3E000C]/65 truncate">Madhapur Resident</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoCitizen("Rahul Sharma", "rahul.sharma@gmail.com", "+91 98480 44556")}
              className="p-2.5 rounded-xl border border-[#3E000C]/15 bg-[#FFECD1]/30 hover:bg-[#FFECD1]/70 text-left transition-all cursor-pointer shadow-2xs"
            >
              <div className="font-bold text-xs text-[#3E000C]">Rahul Sharma</div>
              <div className="text-[10px] text-[#3E000C]/65 truncate">Banjara Hills Commuter</div>
            </button>
          </div>
        </div>

        {/* Switch to Authority Login */}
        <div className="pt-3 border-t border-[#3E000C]/10 flex flex-col items-center gap-2">
          <div className="text-[11px] text-[#3E000C]/75">
            Are you a Municipal Officer, Ward Engineer, or State Official?
          </div>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3E000C] text-[#FFECD1] text-xs font-semibold shadow-xs hover:bg-[#3E000C]/90 transition-all"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Switch to Authority &amp; State Official Login</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
