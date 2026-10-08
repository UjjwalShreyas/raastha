import { IntentOutput } from "@/lib/ai/schemas";
import { parseVoiceIntent } from "@/lib/intents";

export interface GeminiVoiceAnalysis {
  intent: "report" | "route" | "my_reports" | "sos" | "change_language" | "unknown";
  destination?: string;
  issueType?: "pothole" | "streetlight" | "garbage" | "waterlogging" | "other";
  severity?: "low" | "medium" | "high" | "critical";
  severityScore?: number;
  severityReasoning?: string;
  recommendedSlaHours?: number;
  replyLocal?: string;
  language?: string;
  source?: "gemini" | "keyword_fallback";
}

/**
 * Sends spoken voice transcription to Gemini AI to understand intent,
 * classify hazard type, and evaluate severity with technical reasoning.
 */
export async function processVoiceWithGemini(
  transcript: string,
  language: string = "EN",
  context: Record<string, unknown> = {}
): Promise<GeminiVoiceAnalysis> {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) {
    return { intent: "unknown" };
  }

  try {
    const langCode = (language || "EN").toLowerCase().slice(0, 2);
    const res = await fetch("/api/ai/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: cleanTranscript,
        language: langCode,
        context,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const json = await res.json();
      const data: IntentOutput = json.data;

      // Map raw API intent to standard app intent
      let mappedIntent: GeminiVoiceAnalysis["intent"] = "unknown";
      if (data.intent === "report_issue") mappedIntent = "report";
      else if (data.intent === "find_safe_route") mappedIntent = "route";
      else if (data.intent === "check_status") mappedIntent = "my_reports";
      else if (data.intent === "sos") mappedIntent = "sos";
      else if (data.intent === "change_language") mappedIntent = "change_language";

      return {
        intent: mappedIntent,
        destination: data.fields?.destination,
        issueType: data.fields?.issueType,
        severity: data.fields?.severity,
        severityScore: data.fields?.severity_score,
        severityReasoning: data.fields?.severity_reasoning,
        recommendedSlaHours: data.fields?.recommended_sla_hours,
        replyLocal: data.reply_local,
        language: data.language,
        source: json.source || "gemini",
      };
    }
  } catch (err) {
    console.warn("Gemini intent API notice:", err);
  }

  // Graceful deterministic fallback
  const fallbackIntent = parseVoiceIntent(cleanTranscript);
  return {
    intent: fallbackIntent,
    source: "keyword_fallback",
  };
}
