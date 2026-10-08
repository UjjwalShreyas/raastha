import { IntentOutput } from "@/lib/ai/schemas";

export async function extractIntent(
  transcript: string,
  language: "en" | "hi" | "te" = "en",
  context: { screen?: string; hasDraftReport?: boolean } = {}
): Promise<{ ok: boolean; data: IntentOutput; isMock?: boolean }> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_AI === "true") {
    return {
      ok: true,
      isMock: true,
      data: {
        intent: "report_issue",
        fields: { issueType: "Pothole" },
        language,
        reply_local: "Opening hazard report.",
      },
    };
  }

  try {
    const res = await fetch("/api/ai/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, language, context }),
    });

    const json = await res.json();
    if (json.ok && json.data) {
      return { ok: true, data: json.data };
    }
  } catch (err) {
    console.warn("Intent network call failed, falling back locally:", err);
  }

  // Client-side fallback
  return {
    ok: true,
    data: {
      intent: "unknown",
      fields: {},
      language,
      reply_local: "Please repeat your request.",
    },
  };
}
