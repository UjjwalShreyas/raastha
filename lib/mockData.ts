export interface HazardIssue {
  id: string;
  trackingId: string;
  title: string;
  type: "Pothole" | "Broken Streetlight" | "Waterlogging" | "Open Manhole" | "Harassment Spot" | "Road Debris";
  severity: 1 | 2 | 3 | 4 | 5;
  exposureCount: number; // Daily commuters/pedestrians affected
  priorityScore: number; // Exposure-weighted score (Severity * Exposure / 100)
  location: {
    lat: number;
    lng: number;
    address: string;
    ward: string;
  };
  reportedAt: string;
  slaMinutesRemaining: number; // Negative if overdue
  slaFormatted: string;
  status: "Pending" | "In Progress" | "Resolved";
  beforePhoto: string;
  afterPhoto?: string;
  aiClassification: {
    detectedObject: string;
    confidence: number;
    hazardIndex: string;
    impactDescription: string;
  };
  clarifications?: {
    question: string;
    answer?: string;
  }[];
  resolutionNotes?: string;
}

export interface RouteOption {
  id: "fastest" | "safest";
  name: string;
  duration: string;
  durationMinutes: number;
  distance: string;
  distanceKm: number;
  safetyScore: number; // 0-100
  color: string;
  description: string;
  highlights: string[];
  hazardsAvoided: number;
  lightingQuality: "Poor" | "Moderate" | "Well Lit";
  cctvCoverage: "Low" | "Medium" | "High (Safe Corridor)";
  coordinates: [number, number][];
}

// Center reference around central tech/civic hub: Bengaluru Koramangala / Indiranagar area (12.9352, 77.6245)
export const MOCK_BASE_COORDINATES: [number, number] = [12.9352, 77.6245];

export const MOCK_ISSUES: HazardIssue[] = [
  {
    id: "iss-101",
    trackingId: "RST-8924A",
    title: "Deep Pothole at Junction Turn",
    type: "Pothole",
    severity: 5,
    exposureCount: 4200,
    priorityScore: 210, // 5 * 4200 / 100
    location: {
      lat: 12.9372,
      lng: 77.6225,
      address: "80 Feet Rd, 4th Block, Koramangala",
      ward: "Ward 151 - Koramangala",
    },
    reportedAt: "35 mins ago",
    slaMinutesRemaining: 85,
    slaFormatted: "1h 25m left",
    status: "Pending",
    beforePhoto: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80",
    aiClassification: {
      detectedObject: "Deep Asphalt Cavity (>18cm)",
      confidence: 96,
      hazardIndex: "Severe Roadway Hazard",
      impactDescription: "High risk of 2-wheeler skidding and rim breakage during peak transit.",
    },
    clarifications: [
      { question: "Is the road completely blocked?", answer: "No, one lane affected" },
      { question: "Is water accumulation hiding the depth?", answer: "Yes" },
    ],
  },
  {
    id: "iss-102",
    trackingId: "RST-7712B",
    title: "Faulty High-Mast Streetlight & Pitch Dark Stretch",
    type: "Broken Streetlight",
    severity: 4,
    exposureCount: 3850,
    priorityScore: 154,
    location: {
      lat: 12.9338,
      lng: 77.6268,
      address: "Crossroad 12, Near St. John's Transit Gate",
      ward: "Ward 151 - Koramangala",
    },
    reportedAt: "2 hours ago",
    slaMinutesRemaining: 180,
    slaFormatted: "3h 00m left",
    status: "In Progress",
    beforePhoto: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80",
    aiClassification: {
      detectedObject: "Extinguished Sodium Halide Lamp fixture",
      confidence: 92,
      hazardIndex: "High Vulnerability Dark Zone",
      impactDescription: "0 LUX illumination across 120m pedestrian corridor after 7:30 PM.",
    },
    clarifications: [
      { question: "Are multiple poles non-functional?", answer: "Yes, 3 poles in series" },
    ],
  },
  {
    id: "iss-103",
    trackingId: "RST-6531C",
    title: "Open Storm Drain / Uncovered Manhole",
    type: "Open Manhole",
    severity: 5,
    exposureCount: 2900,
    priorityScore: 145,
    location: {
      lat: 12.9315,
      lng: 77.6202,
      address: "Opposite National Games Village, Inner Ring Rd",
      ward: "Ward 150 - Ejipura",
    },
    reportedAt: "4 hours ago",
    slaMinutesRemaining: -25,
    slaFormatted: "Overdue (25m)",
    status: "Pending",
    beforePhoto: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=80",
    aiClassification: {
      detectedObject: "Broken Cast Iron Manhole Cover",
      confidence: 98,
      hazardIndex: "Critical Life Threat",
      impactDescription: "Open subterranean drop of 2.4 meters without safety barricades.",
    },
    clarifications: [
      { question: "Is any barricade placed by locals?", answer: "Only a small branch" },
    ],
  },
  {
    id: "iss-104",
    trackingId: "RST-5420D",
    title: "Heavy Monsoon Waterlogging Submerging Footpath",
    type: "Waterlogging",
    severity: 4,
    exposureCount: 3100,
    priorityScore: 124,
    location: {
      lat: 12.9395,
      lng: 77.6291,
      address: "1st Main Rd, Sony Signal Flyover descent",
      ward: "Ward 151 - Koramangala",
    },
    reportedAt: "1 hour ago",
    slaMinutesRemaining: 140,
    slaFormatted: "2h 20m left",
    status: "Pending",
    beforePhoto: "https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?w=600&auto=format&fit=crop&q=80",
    aiClassification: {
      detectedObject: "Stagnant Water Inundation (Depth ~30cm)",
      confidence: 94,
      hazardIndex: "Urban Drain Choke",
      impactDescription: "Pedestrians forced onto motorized carriageway; traffic bottleneck.",
    },
  },
  {
    id: "iss-105",
    trackingId: "RST-4319E",
    title: "Isolated Dark Alley with Frequent Loitering",
    type: "Harassment Spot",
    severity: 4,
    exposureCount: 1950,
    priorityScore: 78,
    location: {
      lat: 12.9288,
      lng: 77.6234,
      address: "Lane 4B, Behind Bus Depot Cul-de-sac",
      ward: "Ward 152 - Madiwala",
    },
    reportedAt: "5 hours ago",
    slaMinutesRemaining: 360,
    slaFormatted: "6h 00m left",
    status: "In Progress",
    beforePhoto: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    aiClassification: {
      detectedObject: "Blind Corner with No CCTV / Broken Lamps",
      confidence: 89,
      hazardIndex: "Women Safety Flag",
      impactDescription: "Identified low-surveillance zone with 4 citizen safety alerts reported this week.",
    },
  },
  {
    id: "iss-106",
    trackingId: "RST-3208F",
    title: "Construction Debris Spilled Across Cycle Track",
    type: "Road Debris",
    severity: 3,
    exposureCount: 1600,
    priorityScore: 48,
    location: {
      lat: 12.9412,
      lng: 77.6198,
      address: "100 Ft Rd, Near Sony World Junction",
      ward: "Ward 151 - Koramangala",
    },
    reportedAt: "7 hours ago",
    slaMinutesRemaining: 480,
    slaFormatted: "8h 00m left",
    status: "Resolved",
    beforePhoto: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f9?w=600&auto=format&fit=crop&q=80",
    afterPhoto: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=80",
    aiClassification: {
      detectedObject: "Gravel & Reinforcement Bars",
      confidence: 95,
      hazardIndex: "Micro-Obstruction",
      impactDescription: "Clearing completed by Ward Rapid Response unit.",
    },
    resolutionNotes: "Dump truck debris cleared by Sweeper Unit 4. Surface washed.",
  },
];

export const MOCK_ROUTES: RouteOption[] = [
  {
    id: "fastest",
    name: "Fastest Route",
    duration: "12 mins",
    durationMinutes: 12,
    distance: "2.1 km",
    distanceKm: 2.1,
    safetyScore: 45,
    color: "rgba(62, 0, 12, 0.45)",
    description: "Fastest travel time via main arterial roads, but crosses 2 unlit alleys.",
    highlights: ["12 mins (Fastest)", "2.1 km", "Safety: 45/100 (High Risk after 8 PM)", "Passes 2 dark spots with broken lights"],
    hazardsAvoided: 0,
    lightingQuality: "Poor",
    cctvCoverage: "Low",
    coordinates: [
      [12.9352, 77.6245],
      [12.9360, 77.6235],
      [12.9372, 77.6225], // Passes Pothole hazard
      [12.9385, 77.6240],
      [12.9398, 77.6255],
      [12.9415, 77.6270],
      [12.9430, 77.6285],
    ],
  },
  {
    id: "safest",
    name: "Safest Route",
    duration: "14 mins",
    durationMinutes: 14,
    distance: "2.4 km",
    distanceKm: 2.4,
    safetyScore: 88,
    color: "#3E000C",
    description: "14 mins, 2.4 km, Safety: 88/100. Avoids 2 dark alleys & active road hazards.",
    highlights: [
      "14 mins (+2 mins safe detour)",
      "2.4 km",
      "Safety: 88/100 (Safe Corridor Verified)",
      "Avoids 2 dark alleys and deep pothole cluster",
      "100% Streetlight Illumination & Active CCTV",
    ],
    hazardsAvoided: 3,
    lightingQuality: "Well Lit",
    cctvCoverage: "High (Safe Corridor)",
    coordinates: [
      [12.9352, 77.6245],
      [12.9345, 77.6258],
      [12.9340, 77.6280],
      [12.9362, 77.6292],
      [12.9388, 77.6300],
      [12.9410, 77.6295],
      [12.9430, 77.6285],
    ],
  },
];

export const MOCK_CITIZEN_HISTORY: HazardIssue[] = [
  MOCK_ISSUES[0],
  MOCK_ISSUES[1],
  MOCK_ISSUES[5],
];

export const MOCK_DESTINATIONS = [
  { name: "Indiranagar Metro Station", address: "100 Ft Road, Indiranagar", distance: "2.4 km" },
  { name: "Koramangala Social / 7th Block", address: "80 Feet Rd, 7th Block", distance: "1.1 km" },
  { name: "St. John's Medical College Hospital", address: "Sarjapur Main Road", distance: "1.8 km" },
  { name: "RMZ Ecospace Tech Park Gate 2", address: "Outer Ring Road, Bellandur", distance: "4.5 km" },
];

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  EN: {
    appName: "Raastha",
    tagline: "Voice-First Civic Safety Platform",
    reportProblem: "Report a Problem",
    reportProblemSub: "Snap photo or speak to report hazards instantly",
    safeRoute: "Safe Route",
    safeRouteSub: "AI-lit navigation avoiding dark spots & hazards",
    myReports: "My Reports",
    myReportsSub: "Track live status of your reported issues",
    voicePromptPlaceholder: "Tap mic or say 'Report pothole' or 'Find safe route'",
    listening: "Listening for voice command...",
    speakNow: "Speak now in your language...",
    authorityPortal: "Official Dashboard",
    sosButton: "I Feel Unsafe",
    sosTriggered: "Emergency Alert Broadcasted!",
    sosDesc: "Your live location is dispatched to Civic Patrol and emergency contacts.",
    fastestRoute: "Fastest Route",
    safestRoute: "Safest Route",
    startNavigation: "Start Safe Navigation",
    priorityScore: "Priority Score",
    exposureCount: "Exposure Volume",
    slaTimer: "SLA Deadline",
    verifyFix: "Verify Fix",
    uploadAfterPhoto: "Upload After Photo",
  },
  HI: {
    appName: "रास्ता (Raastha)",
    tagline: "आवाज़-आधारित नागरिक सुरक्षा प्लेटफॉर्म",
    reportProblem: "समस्या की रिपोर्ट करें",
    reportProblemSub: "गड्ढों या अंधेरे रास्तों की बोलकर या फ़ोटो से रिपोर्ट करें",
    safeRoute: "सुरक्षित रास्ता खोजें",
    safeRouteSub: "अंधेरे स्थानों और खतरों से बचकर रोशनी भरा मार्ग",
    myReports: "मेरी शिकायतें",
    myReportsSub: "अपनी दर्ज शिकायतों की वास्तविक स्थिति देखें",
    voicePromptPlaceholder: "माइक दबाएं या कहें 'गड्ढे की शिकायत करो'",
    listening: "आवाज़ सुनी जा रही है...",
    speakNow: "अपनी भाषा में बोलें...",
    authorityPortal: "अधिकारी डैशबोर्ड",
    sosButton: "मैं असुरक्षित महसूस कर रहा हूँ",
    sosTriggered: "आपातकालीन चेतावनी भेजी गई!",
    sosDesc: "आपका लाइव स्थान नागरिक सुरक्षा गश्ती दल को भेज दिया गया है।",
    fastestRoute: "सबसे तेज़ रास्ता",
    safestRoute: "सबसे सुरक्षित रास्ता",
    startNavigation: "सुरक्षित नेविगेशन शुरू करें",
    priorityScore: "प्राथमिकता स्कोर",
    exposureCount: "यातायात प्रभाव",
    slaTimer: "निवारण समय सीमा",
    verifyFix: "समाधान सत्यापित करें",
    uploadAfterPhoto: "सुधार के बाद की फ़ोटो डालें",
  },
  TE: {
    appName: "రాస్తా (Raastha)",
    tagline: "వాయిస్-ఫస్ట్ పౌర భద్రతా ప్లాట్‌ఫారమ్",
    reportProblem: "సమస్యను నివేదించండి",
    reportProblemSub: "రోడ్డు గుంతలు లేదా చీకటి దారులపై మాట్లాడి ఫిర్యాదు చేయండి",
    safeRoute: "సురక్షిత మార్గం",
    safeRouteSub: "చీకటి ప్రదేశాలను తప్పించి లైటింగ్ ఉన్న సురక్షిత దారి",
    myReports: "నా నివేదికలు",
    myReportsSub: "మీ సమస్యల పరిష్కార పురోగతిని ట్రాక్ చేయండి",
    voicePromptPlaceholder: "మైక్ నొక్కండి లేదా 'రోడ్డు సమస్య' అని మాట్లాడండి",
    listening: "వినబడుతోంది...",
    speakNow: "మీ భాషలో మాట్లాడండి...",
    authorityPortal: "అధికారిక డాష్‌బోర్డ్",
    sosButton: "నాకు రక్షణ కావాలి",
    sosTriggered: "అత్యవసర హెచ్చరిక పంపబడింది!",
    sosDesc: "మీ లైవ్ లొకేషన్ పౌర భద్రతా సిబ్బందికి పంపబడింది.",
    fastestRoute: "వేగవంతమైన మార్గం",
    safestRoute: "అత్యంత సురక్షితమైన మార్గం",
    startNavigation: "సురక్షిత నావిగేషన్ ప్రారంభించండి",
    priorityScore: "ప్రాధాన్యతా స్కోర్",
    exposureCount: "ప్రభావిత జనాభా",
    slaTimer: "పరిష్కార గడువు",
    verifyFix: "పరిష్కారాన్ని ధృవీకరించండి",
    uploadAfterPhoto: "పరిష్కరించిన ఫోటోను అప్‌లోడ్ చేయండి",
  },
};

// Simulation helper for network latency
export const simulateDelay = (ms: number = 800): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
