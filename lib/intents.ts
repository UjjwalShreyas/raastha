/**
 * Civic command intent parser for Raastha VoiceBar.
 * Supports English, Hindi, and Telugu multilingual keywords.
 */

export type ParsedIntent = "report" | "route" | "my_reports" | "sos" | "unknown";

export function parseVoiceIntent(rawText: string): ParsedIntent {
  if (!rawText) return "unknown";
  const text = rawText.toLowerCase().trim();

  // 1. Emergency SOS Intent (Strictly opens SOS sheet; NEVER loose or automatic broadcast)
  const sosKeywords = [
    "help",
    "emergency",
    "sos",
    "danger",
    "police",
    "save me",
    // Hindi
    "मदद",
    "सहायता",
    "आपातकाल",
    "आपातकालीन",
    "खतरा",
    "पुलिस",
    "एसओएस",
    "बचाओ",
    // Telugu
    "సహాయం",
    "కాపాడండి",
    "అత్యవసరం",
    "ప్రమాదం",
    "పోలీస్",
    "ఎస్ఓఎస్",
  ];
  if (sosKeywords.some((kw) => text.includes(kw))) {
    return "sos";
  }

  // 2. Report Hazard Intent
  const reportKeywords = [
    "report",
    "pothole",
    "hazard",
    "complaint",
    "issue",
    "broken light",
    "streetlight",
    "garbage",
    "manhole",
    "waterlogging",
    "file report",
    // Hindi
    "शिकायत",
    "गड्ढा",
    "गड्ढे",
    "समस्या",
    "रिपोर्ट",
    "खराब लाइट",
    "कचरा",
    "जलभराव",
    "मैनहोल",
    // Telugu
    "ఫిర్యాదు",
    "నివేదించు",
    "నివేదిక",
    "సమస్య",
    "గుంత",
    "గొయ్యి",
    "లైట్",
    "చెత్త",
  ];
  if (reportKeywords.some((kw) => text.includes(kw))) {
    return "report";
  }

  // 3. Safe Corridor Route Intent
  const routeKeywords = [
    "safe route",
    "route",
    "corridor",
    "navigation",
    "directions",
    "navigate",
    "safe path",
    "path",
    // Hindi
    "सुरक्षित मार्ग",
    "मार्ग",
    "रास्ता",
    "सुरक्षित रास्ता",
    "नेविगेशन",
    "दिशा",
    // Telugu
    "సురక్షిత మార్గం",
    "మార్గం",
    "దారి",
    "రహదారి",
    "నావిగేషన్",
    "దిశ",
  ];
  if (routeKeywords.some((kw) => text.includes(kw))) {
    return "route";
  }

  // 4. My Reports Tracking Intent
  const myReportsKeywords = [
    "my reports",
    "my report",
    "status",
    "track",
    "tracking",
    "history",
    "tickets",
    // Hindi
    "मेरी शिकायत",
    "मेरी रिपोर्ट",
    "स्थिति",
    "ट्रैक",
    "इतिहास",
    // Telugu
    "నా నివేదికలు",
    "ఫిర్యాదు స్థితి",
    "ట్రాకింగ్",
    "నా ఫిర్యాదులు",
  ];
  if (myReportsKeywords.some((kw) => text.includes(kw))) {
    return "my_reports";
  }

  return "unknown";
}
