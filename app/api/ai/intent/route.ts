import { NextRequest, NextResponse } from "next/server";
import { generateJson, checkRateLimit, computeCacheHash } from "@/lib/ai/gemini";
import { IntentOutputSchema, IntentOutput } from "@/lib/ai/schemas";

const SYSTEM_PROMPT = `
You parse voice transcripts from citizens using the civic safety app "Raastha" in India.
The user speaks in English, Hindi, Telugu, or code-mixed dialects (Hinglish, Tenglish).

Your task:
1. Identify user intent from strictly these values:
   - "report_issue": Reporting a pothole, broken light, waterlogging, or road hazard.
   - "find_safe_route": Asking for directions, safe walking routes, lit corridors.
   - "check_status": Inquiring about previously reported hazard or tracking ticket.
   - "change_language": Asking to switch app language to English, Hindi, or Telugu.
   - "sos": Emergency distress, danger, immediate police/medical help.
   - "help": General questions about how to use the app.
   - "unknown": Unclear statement.

2. Estimate Hazard Classification & Severity if the user describes a problem:
   - issueType: "pothole" | "streetlight" | "garbage" | "waterlogging" | "other"
   - severity:
     * "critical": lethal risks, deep sinkhole/open manhole on highway, exposed live wire, submerged road (Score: 5, SLA: 6 hrs)
     * "high": deep pothole causing skids, total darkness on sharp turn, road blocked by garbage (Score: 4, SLA: 12 hrs)
     * "medium": standard potholes, broken light on residential street, overflowing bin (Score: 3, SLA: 24 hrs)
     * "low": minor cosmetic asphalt crack, small litter (Score: 1-2, SLA: 48 hrs)
   - severity_score: number 1 to 5
   - severity_reasoning: Short 1-sentence technical reason for this severity level.
   - recommended_sla_hours: 6 | 12 | 24 | 48
   - destination: string (only if clearly mentioned, e.g. "Charminar", "Gachibowli", "Hitec City")

3. Write reply_local: ONE short, natural sentence in the user's spoken language acknowledging their request and confirming the action.
`;

/**
 * Deterministic keyword fallback for offline / degraded network modes.
 */
export function matchKeywordIntent(
  transcript: string,
  lang: "en" | "hi" | "te" = "en"
): IntentOutput {
  const lower = transcript.toLowerCase().trim();

  // 1. Language change
  if (lower.includes("hindi") || lower.includes("हिंदी")) {
    return {
      intent: "change_language",
      fields: { language: "hi" },
      language: "hi",
      reply_local: "भाषा बदलकर हिंदी कर दी गई है।",
    };
  }
  if (lower.includes("telugu") || lower.includes("తెలుగు")) {
    return {
      intent: "change_language",
      fields: { language: "te" },
      language: "te",
      reply_local: "భాష తెలుగుకి మార్చబడింది.",
    };
  }
  if (lower.includes("english")) {
    return {
      intent: "change_language",
      fields: { language: "en" },
      language: "en",
      reply_local: "Language switched to English.",
    };
  }

  // 2. SOS
  if (
    lower.includes("sos") ||
    lower.includes("emergency") ||
    lower.includes("danger") ||
    lower.includes("police") ||
    lower.includes("मदद") ||
    lower.includes("सहायता") ||
    lower.includes("సహాయం") ||
    lower.includes("కాపాడండి")
  ) {
    return {
      intent: "sos",
      fields: {},
      language: lang,
      reply_local:
        lang === "hi"
          ? "आपातकालीन एसओएस स्क्रीन खोली जा रही है।"
          : lang === "te"
          ? "అత్యవసర SOS తెరవబడుతోంది."
          : "Opening Emergency SOS screen.",
    };
  }

  // 3. Safe Route Navigation
  if (
    lower.includes("route") ||
    lower.includes("rasta") ||
    lower.includes("raasta") ||
    lower.includes("navigate") ||
    lower.includes("map") ||
    lower.includes("take me to") ||
    lower.includes("direction") ||
    lower.includes("దారి") ||
    lower.includes("రాస్తా") ||
    lower.includes("मार्ग")
  ) {
    const toMatch = lower.match(/(?:to|towards|ke liye|ki taraf|వరకు)\s+([a-zA-Z0-9\s]+)/i);
    const dest = toMatch ? toMatch[1].trim() : undefined;
    return {
      intent: "find_safe_route",
      fields: dest ? { destination: dest } : {},
      language: lang,
      reply_local:
        lang === "hi"
          ? "सुरक्षित मार्ग नेविगेशन खोला जा रहा है।"
          : lang === "te"
          ? "సురక్షిత రూట్ నావిగేషన్ తెరవబడుతోంది."
          : "Opening Safe Corridor Navigation.",
    };
  }

  // 4. Report Hazard & Severity Estimation
  if (
    lower.includes("pothole") ||
    lower.includes("khaddha") ||
    lower.includes("light") ||
    lower.includes("drain") ||
    lower.includes("report") ||
    lower.includes("hazard") ||
    lower.includes("problem") ||
    lower.includes("damage") ||
    lower.includes("garbage") ||
    lower.includes("water") ||
    lower.includes("गड्ढा") ||
    lower.includes("गुंत") ||
    lower.includes("చెత్త")
  ) {
    const isLight = lower.includes("light") || lower.includes("लाइट") || lower.includes("లైట్");
    const isWater = lower.includes("water") || lower.includes("drain") || lower.includes("पानी") || lower.includes("నీరు");
    const isGarbage = lower.includes("garbage") || lower.includes("कचरा") || lower.includes("చెత్త");
    const type = isLight ? "streetlight" : isWater ? "waterlogging" : isGarbage ? "garbage" : "pothole";
    
    const isCritical = lower.includes("deep") || lower.includes("huge") || lower.includes("danger") || lower.includes("accident") || lower.includes("गंभीर");
    const severity = isCritical ? "high" : "medium";
    const score = isCritical ? 4 : 3;

    return {
      intent: "report_issue",
      fields: {
        issueType: type,
        severity: severity,
        severity_score: score,
        severity_reasoning: `Identified ${type} issue from voice description.`,
        recommended_sla_hours: isCritical ? 12 : 24,
      },
      language: lang,
      reply_local:
        lang === "hi"
          ? "समस्या रिपोर्ट फॉर्म खोला जा रहा है।"
          : lang === "te"
          ? "సమస్య రిపోర్ట్ ఫారం తెరవబడుతోంది."
          : "Opening Hazard Report Wizard.",
    };
  }

  // 5. Status Check
  if (lower.includes("status") || lower.includes("ticket") || lower.includes("my report") || lower.includes("स्थिति") || lower.includes("నివేదిక")) {
    return {
      intent: "check_status",
      fields: {},
      language: lang,
      reply_local:
        lang === "hi"
          ? "आपकी रिपोर्ट की स्थिति जांची जा रही है।"
          : lang === "te"
          ? "మీ రిపోర్ట్ స్థితి తనిఖీ చేయబడుతోంది."
          : "Opening your reported issues list.",
    };
  }

  return {
    intent: "unknown",
    fields: {},
    language: lang,
    reply_local:
      lang === "hi"
        ? "माफ़ कीजिए, समझ नहीं आया। कृपया दोबारा बोलें।"
        : lang === "te"
        ? "క్షమించండి, అర్థం కాలేదు. దయచేసి మళ్ళీ చెప్పండి."
        : "Sorry, I didn't catch that. Please speak or select an option.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { ok: false, code: "rate_limited", message: "Rate limit reached." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { transcript, language = "en", context = {} } = body;

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return NextResponse.json(
        { ok: false, code: "unsafe_input", message: "Transcript text is required." },
        { status: 400 }
      );
    }

    const cacheKey = computeCacheHash(`intent_severity:${language}`, transcript.trim().toLowerCase());

    const result = await generateJson({
      system: SYSTEM_PROMPT,
      parts: [
        {
          text: `Spoken Language: ${language}. App Screen Context: ${JSON.stringify(context)}. Transcript: "${transcript.trim()}"`,
        },
      ],
      zod: IntentOutputSchema,
      cacheKey,
      temperature: 0.1,
    });

    if (!result.ok) {
      // Gracefully fall back to deterministic regex parser
      const fallback = matchKeywordIntent(transcript, language);
      return NextResponse.json({
        ok: true,
        data: fallback,
        source: "keyword_fallback",
        latencyMs: result.latencyMs,
      });
    }

    return NextResponse.json({
      ok: true,
      data: result.data,
      source: "gemini",
      cached: result.cached,
      latencyMs: result.latencyMs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, code: "unavailable", message: err.message || "Intent parser error." },
      { status: 500 }
    );
  }
}
