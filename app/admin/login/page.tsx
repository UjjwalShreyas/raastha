"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const router = useRouter();
  const { t } = useApp();
  const { isAuthenticated, isLoading, isConfigured, signIn } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Already signed in: go straight to the dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/admin");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);

    const { error } = await signIn(email.trim(), password);
    if (error) {
      // Show a generic message for bad credentials; surface anything else (network etc.)
      const isCredentialError = /invalid login credentials/i.test(error);
      setErrorMsg(isCredentialError ? t("authInvalid") : error);
      setSubmitting(false);
      return;
    }
    // The auth listener updates context; the effect above redirects.
    setSubmitting(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 border border-[#3E000C]/15 rounded-3xl p-6 sm:p-8 shadow-md space-y-6 text-[#3E000C]"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#3E000C] text-[#FFECD1] flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{t("adminLoginTitle")}</h1>
          <p className="text-xs text-[#3E000C]/70 font-normal">{t("adminLoginSub")}</p>
        </div>

        {!isConfigured ? (
          <div
            role="alert"
            className="text-xs text-amber-900 bg-amber-100/90 border border-amber-300 p-3 rounded-xl flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <span>{t("authNotConfigured")}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label
                htmlFor="admin-email"
                className="text-[11px] font-bold text-[#3E000C]/70 uppercase tracking-wider block"
              >
                {t("emailLabel")}
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#FFECD1]/20 border border-[#3E000C]/20 rounded-xl px-3 py-2 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="admin-password"
                className="text-[11px] font-bold text-[#3E000C]/70 uppercase tracking-wider block"
              >
                {t("passwordLabel")}
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#FFECD1]/20 border border-[#3E000C]/20 rounded-xl px-3 py-2 text-xs text-[#3E000C] focus:outline-none focus:border-[#3E000C]"
              />
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
              leftIcon={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {submitting ? t("signingIn") : t("signIn")}
            </Button>
          </form>
        )}

        <div className="pt-2 text-center border-t border-[#3E000C]/10">
          <Link
            href="/"
            className="text-xs font-semibold text-[#3E000C]/70 underline hover:text-[#3E000C]"
          >
            {t("backToCitizen")}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
