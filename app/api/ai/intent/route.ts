import { NextRequest, NextResponse } from "next/server";
import { generateJson, checkRateLimit, computeCacheHash } from "@/lib/ai/gemini";
import { IntentOutputSchema, IntentOutput } from "@/lib/ai/schemas";

const SYSTEM_PROMPT = `
You parse voice transcripts from citizens using the civic safety app "Raastha" in India.
The user speaks in English, Hindi, Telugu, or code-mixed dialects (Hinglish, Tenglish).

Your task:
1. Identify user intent from strictly these 6 values:
   - "report_issue": Reporting a pothole, broken light, waterlogging, or road hazard.
   - "find_safe_route": Asking for directions, safe walking routes, lit corridors.
   - "check_status": Inquiring about previously reported hazard or tracking ticket.
   - "change_language": Asking to switch app language to English, Hindi, or Telugu.
   - "help": General questions about how to use the app or emergency help.
   - "unknown": Unclear, gibberish, or unrelated statement.

2. Extract explicit fields (do NOT hallucinate a destination if none was spoken):
   - destination: string (only if clearly mentioned, e.g. "Koramangala", "Indiranagar Metro")
   - language: "en" | "hi" | "te"
   - reportId: string (e.g. "RST-101")
   - issueType: string (e.g. "Pothole", "Broken Streetlight")

3. Write reply_local: ONE short, natural sentence in the user's spoken language acknowledging their request.
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

  // 2. Safe Route Navigation
  if (
    lower.includes("route") ||
    lower.includes("rasta") ||
    lower.includes("raasta") ||
    lower.includes("navigate") ||
    lower.includes("map") ||
    lower.includes("take me to") ||
    lower.includes("direction") ||
    lower.includes("దారి") ||
    lower.includes("रास्ता")
  ) {
    // Extract destination if "to <dest>" pattern exists
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

  // 3. Report Hazard
  if (
    lower.includes("pothole") ||
    lower.includes("khaddha") ||
    lower.includes("light") ||
    lower.includes("drain") ||
    lower.includes("report") ||
    lower.includes("hazard") ||
    lower.includes("problem") ||
    lower.includes("damage") ||
    lower.includes("गड्ढा") ||
    lower.includes("గుంత")
  ) {
    return {
      intent: "report_issue",
      fields: { issueType: lower.includes("light") ? "Broken Streetlight" : "Pothole" },
      language: lang,
      reply_local:
        lang === "hi"
          ? "समस्या दर्ज करने का फॉर्म खोला जा रहा है।"
          : lang === "te"
          ? "సమస్య రిపోర్ట్ ఫారం తెరవబడుతోంది."
          : "Opening Hazard Report Wizard.",
    };
  }

  // 4. Status Check
  if (lower.includes("status") || lower.includes("ticket") || lower.includes("my report") || lower.includes("स्थिति")) {
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

  // 5. Help
  if (lower.includes("help") || lower.includes("sos") || lower.includes("emergency") || lower.includes("मदद") || lower.includes("సహాయం")) {
    return {
      intent: "help",
      fields: {},
      language: lang,
      reply_local:
        lang === "hi"
          ? "रास्ता सहायता केंद्र: आप बोलकर समस्या रिपोर्ट कर सकते हैं।"
          : lang === "te"
          ? "రాస్తా సహాయం: మీరు మాట్లాడి సమస్యను నివేదించవచ్చు."
          : "Raastha Help: You can report hazards or find safe lighted routes.",
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

    const cacheKey = computeCacheHash(`intent:${language}`, transcript.trim().toLowerCase());

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
