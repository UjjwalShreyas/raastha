import { extractIntent } from "@/lib/api/intent";
import { IntentOutput } from "@/lib/ai/schemas";

export interface ProcessVoiceResult {
  intent: IntentOutput["intent"];
  destination?: string;
  language?: "en" | "hi" | "te";
  replyLocal: string;
  navigatePath?: string;
}

/**
 * High-level voice processor connecting browser transcript to server-side intent extraction.
 */
export async function processVoiceTranscript(
  transcript: string,
  currentLanguage: "en" | "hi" | "te" = "en",
  screenContext: string = "home"
): Promise<ProcessVoiceResult> {
  const res = await extractIntent(transcript, currentLanguage, { screen: screenContext });
  const data = res.data;

  let navigatePath: string | undefined;

  if (data.intent === "find_safe_route") {
    navigatePath = data.fields.destination
      ? `/route?dest=${encodeURIComponent(data.fields.destination)}`
      : `/route`;
  } else if (data.intent === "report_issue") {
    navigatePath = `/report`;
  } else if (data.intent === "check_status") {
    navigatePath = `/my-reports`;
  }

  return {
    intent: data.intent,
    destination: data.fields.destination,
    language: data.fields.language,
    replyLocal: data.reply_local,
    navigatePath,
  };
}
