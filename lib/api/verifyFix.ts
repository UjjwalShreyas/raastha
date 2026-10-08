import { VerifyFixOutput } from "@/lib/ai/schemas";

export interface VerifyFixResult extends VerifyFixOutput {
  needsHumanReview: boolean;
  auditDecision: "APPROVED" | "NEEDS_HUMAN_REVIEW";
  auditReason: string;
}

export async function verifyFix(
  beforeBase64: string | undefined,
  afterBase64: string,
  issueType: string = "Pothole",
  options: { lat?: number; lng?: number } = {}
): Promise<{ ok: boolean; data: VerifyFixResult; isMock?: boolean }> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_AI === "true") {
    return {
      ok: true,
      isMock: true,
      data: {
        fixed: "true",
        confidence: 0.94,
        note: "Asphalt patch compaction verified against arterial grade standard.",
        same_location_likely: true,
        needsHumanReview: false,
        auditDecision: "APPROVED",
        auditReason: "Fix verified and approved.",
      },
    };
  }

  try {
    const res = await fetch("/api/ai/verify-fix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        beforeBase64,
        afterBase64,
        issueType,
        lat: options.lat,
        lng: options.lng,
      }),
    });

    const json = await res.json();
    if (json.ok && json.data) {
      return { ok: true, data: json.data };
    }
  } catch (err) {
    console.warn("Verify fix network call error:", err);
  }

  // Safe fallback: never auto-approve on error -> always route to human review
  return {
    ok: true,
    data: {
      fixed: "uncertain",
      confidence: 0.5,
      note: "Network evaluation unavailable. Routed to supervisor inspection.",
      same_location_likely: true,
      needsHumanReview: true,
      auditDecision: "NEEDS_HUMAN_REVIEW",
      auditReason: "AI verification was unavailable. Human supervisor audit required.",
    },
  };
}
