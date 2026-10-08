export interface HazardIssue {
  id: string;
  trackingId: string;
  title: string;
  type: "Pothole" | "Broken Streetlight" | "Waterlogging" | "Open Manhole" | "Harassment Spot" | "Road Debris";
  severity: 1 | 2 | 3 | 4 | 5;
  exposureCount: number; // Daily commuters/pedestrians affected (proxy from route volume & road class)
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
  confirmationsCount?: number;
  isClustered?: boolean;
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

// Center reference: Hyderabad GHMC (Hitec City / Madhapur Corridor: 17.4401, 78.3489)
export const MOCK_BASE_COORDINATES: [number, number] = [17.4401, 78.3489];

export const MOCK_ISSUES: HazardIssue[] = [
  {
    id: "iss-101",
    trackingId: "GHMC-8924A",
    title: "Deep Pothole at Cyber Towers Incline",
    type: "Pothole",
    severity: 5,
    exposureCount: 4200,
    priorityScore: 210, // 5 * 4200 / 100
    location: {
      lat: 17.4435,
      lng: 78.3772,
      address: "Hitec City Main Rd, Cyber Towers Underpass",
      ward: "Circle 20 - Madhapur / Serilingampally",
    },
    reportedAt: "35 mins ago",
    slaMinutesRemaining: 85,
    slaFormatted: "1h 25m left",
    status: "Pending",
    beforePhoto: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80",
    aiClassification: {
      detectedObject: "Deep Asphalt Cavity (>15cm)",
      confidence: 96,
      hazardIndex: "Severe Roadway Hazard",
      impactDescription: "High risk of 2-wheeler skidding and wheel rim fracture during evening rush hour.",
    },
    clarifications: [
      { question: "Is the road completely blocked?", answer: "No, left lane bottleneck" },
      { question: "Is water accumulation hiding the depth?", answer: "Yes, recent rain puddle" },
    ],
    confirmationsCount: 1,
    isClustered: false,
  },
  {
    id: "iss-102",
    trackingId: "GHMC-7712B",
    title: "Faulty High-Mast Streetlight & Dark Stretch",
    type: "Broken Streetlight",
    severity: 4,
    exposureCount: 3850,
    priorityScore: 154,
    location: {
      lat: 17.4365,
      lng: 78.3842,
      address: "Durgam Cheruvu Approach Lane, Near Cable Bridge",
      ward: "Circle 20 - Madhapur / Serilingampally",
    },
    reportedAt: "2 hours ago",
    slaMinutesRemaining: 180,
    slaFormatted: "3h 00m left",
    status: "In Progress",
    beforePhoto: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80",
    aiClassification: {
      detectedObject: "Extinguished Luminaire Pole Array",
      confidence: 92,
      hazardIndex: "High Vulnerability Dark Zone",
      impactDescription: "0 LUX illumination across 140m pedestrian corridor after 7:00 PM.",
    },
    clarifications: [
      { question: "Are multiple poles non-functional?", answer: "Yes, 3 consecutive poles out" },
    ],
    confirmationsCount: 2,
    isClustered: true,
  },
  {
    id: "iss-103",
    trackingId: "GHMC-6531C",
    title: "Open Storm Drain / Displaced Manhole Lid",
    type: "Open Manhole",
    severity: 5,
    exposureCount: 2900,
    priorityScore: 145,
    location: {
      lat: 17.4520,
      lng: 78.3680,
      address: "Kondapur RTA Crossroad, Opposite Botanical Garden",
      ward: "Ward 104 - Kondapur",
    },
    reportedAt: "4 hours ago",
    slaMinutesRemaining: -25,
    slaFormatted: "Overdue (25m)",
    status: "Pending",
    beforePhoto: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=80",
    aiClassification: {
      detectedObject: "Broken Cast Iron Drainage Chamber",
      confidence: 98,
      hazardIndex: "Critical Life Safety Hazard",
      impactDescription: "Open drop of 2.1 meters into storm conduit without municipal safety barricades.",
    },
    clarifications: [
      { question: "Is any barricade placed by locals?", answer: "Only a wooden pallet placed loosely" },
    ],
    confirmationsCount: 1,
    isClustered: false,
  },
  {
    id: "iss-104",
    trackingId: "GHMC-5420D",
    title: "Monsoon Waterlogging Submerging Footpath",
    type: "Waterlogging",
    severity: 4,
    exposureCount: 3100,
    priorityScore: 124,
    location: {
      lat: 17.4485,
      lng: 78.3582,
      address: "Gachibowli DLF Backroad Arterial",
      ward: "Circle 21 - Gachibowli",
    },
    reportedAt: "1 hour ago",
    slaMinutesRemaining: 140,
    slaFormatted: "2h 20m left",
    status: "Pending",
    beforePhoto: "https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?w=600&auto=format&fit=crop&q=80",
    aiClassification: {
      detectedObject: "Stagnant Water Inundation (~25cm)",
      confidence: 94,
      hazardIndex: "Urban Drain Choke",
      impactDescription: "Pedestrians forced into vehicular traffic lane; severe evening choke.",
    },
    confirmationsCount: 1,
    isClustered: false,
  },
  {
    id: "iss-105",
    trackingId: "GHMC-4319E",
    title: "Unlit Cul-de-sac with Low Visibility",
    type: "Harassment Spot",
    severity: 4,
    exposureCount: 1950,
    priorityScore: 78,
    location: {
      lat: 17.4320,
      lng: 78.4070,
      address: "Jubilee Hills Road 45, Near Ridge Corner",
      ward: "Circle 18 - Jubilee Hills",
    },
    reportedAt: "5 hours ago",
    slaMinutesRemaining: 360,
    slaFormatted: "6h 00m left",
    status: "In Progress",
    beforePhoto: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    aiClassification: {
      detectedObject: "Blind Corner with Inactive Streetlights",
      confidence: 89,
      hazardIndex: "Pedestrian Vulnerability Flag",
      impactDescription: "Low ambient illumination; citizen safety alert flagged.",
    },
    confirmationsCount: 1,
    isClustered: false,
  },
  {
    id: "iss-106",
    trackingId: "GHMC-3208F",
    title: "Construction Gravel & Debris across Cycle Path",
    type: "Road Debris",
    severity: 3,
    exposureCount: 1600,
    priorityScore: 48,
    location: {
      lat: 17.4390,
      lng: 78.3650,
      address: "Kothaguda to Hitec City Arterial",
      ward: "Circle 20 - Madhapur / Serilingampally",
    },
    reportedAt: "7 hours ago",
    slaMinutesRemaining: 480,
    slaFormatted: "8h 00m left",
    status: "Resolved",
    beforePhoto: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f9?w=600&auto=format&fit=crop&q=80",
    afterPhoto: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=80",
    aiClassification: {
      detectedObject: "Aggregate Gravel Spillage",
      confidence: 95,
      hazardIndex: "Micro-Obstruction",
      impactDescription: "Cleared by GHMC rapid response sweeper unit.",
    },
    resolutionNotes: "Debris cleared by GHMC Sanitation Squad 2. Surface asphalt washed.",
    confirmationsCount: 1,
    isClustered: false,
  },
];

export const MOCK_CITIZEN_HISTORY: HazardIssue[] = [
  MOCK_ISSUES[0],
  MOCK_ISSUES[1],
  MOCK_ISSUES[5],
];

// Hyderabad Destinations
export const MOCK_DESTINATIONS: {
  name: string;
  address: string;
  distance: string;
  coordinates: [number, number];
}[] = [
  {
    name: "Hitec City Metro Station",
    address: "Hitec City Main Road, Madhapur",
    distance: "1.8 km",
    coordinates: [17.4474, 78.3762],
  },
  {
    name: "Inorbit Mall Madhapur",
    address: "Mindspace Road, Madhapur",
    distance: "2.3 km",
    coordinates: [17.4344, 78.3866],
  },
  {
    name: "Durgam Cheruvu Cable Bridge",
    address: "Jubilee Hills - Madhapur Link",
    distance: "2.9 km",
    coordinates: [17.4326, 78.3905],
  },
  {
    name: "DLF Cybercity Gate 1",
    address: "Gachibowli IT Corridor",
    distance: "3.4 km",
    coordinates: [17.4485, 78.3582],
  },
];

export const MOCK_ROUTES: RouteOption[] = [
  {
    id: "fastest",
    name: "Direct Route (Shortcut)",
    duration: "11 mins",
    durationMinutes: 11,
    distance: "1.9 km",
    distanceKm: 1.9,
    safetyScore: 58,
    color: "rgba(62, 0, 12, 0.45)",
    description: "Shortest route through narrow interior lanes, passing near reported unlit streetlights.",
    highlights: ["11 mins (Fastest)", "1.9 km", "Safety: 58/100", "Passes unlit lane near Durgam Cheruvu slope"],
    hazardsAvoided: 0,
    lightingQuality: "Poor",
    cctvCoverage: "Low",
    coordinates: [
      [17.4401, 78.3489],
      [17.4415, 78.3550],
      [17.4435, 78.3620],
      [17.4455, 78.3700],
      [17.4474, 78.3762],
    ],
  },
  {
    id: "safest",
    name: "Safe Illuminated Corridor",
    duration: "14 mins",
    durationMinutes: 14,
    distance: "2.3 km",
    distanceKm: 2.3,
    safetyScore: 94,
    color: "#3E000C",
    description: "Follows continuous streetlighting along 100 Feet Arterial Road, avoiding reported potholes.",
    highlights: ["14 mins", "2.3 km", "Safety: 94/100 (Safe Corridor)", "95 LUX streetlighting rating"],
    hazardsAvoided: 3,
    lightingQuality: "Well Lit",
    cctvCoverage: "High (Safe Corridor)",
    coordinates: [
      [17.4401, 78.3489],
      [17.4420, 78.3520],
      [17.4445, 78.3590],
      [17.4460, 78.3680],
      [17.4474, 78.3762],
    ],
  },
];

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  EN: {
    appName: "Raastha",
    tagline: "Voice-First Civic Safety Platform",
    reportProblem: "Report a Hazard",
    reportProblemSub: "Snap photo or speak to report road hazards instantly",
    safeRoute: "Safe Route",
    safeRouteSub: "Illuminated corridor navigation avoiding road defects",
    myReports: "My Reports",
    myReportsSub: "Track live status and verified contractor proofs",
    voicePromptPlaceholder: "Tap mic or say 'Report pothole' or 'Find safe route'",
    listening: "Listening for voice command...",
    speakNow: "Speak now in your language...",
    authorityPortal: "Official Ward Command",
    sosButton: "Emergency SOS",
    sosTriggered: "Emergency Location Sharing",
    sosDesc: "Share your live location instantly through WhatsApp, SMS, or 112 direct call.",
    fastestRoute: "Direct Route",
    safestRoute: "Safe Illuminated Corridor",
    startNavigation: "Start Safe Navigation",
    priorityScore: "Priority Score",
    exposureCount: "Exposure Volume",
    slaTimer: "SLA Deadline",
    verifyFix: "Verify Fix",
    reportSuccess: "Report submitted successfully. Your tracking ID is",
    navStart: "Starting safe corridor navigation to",
    navArrived: "You have arrived at your destination safely via the illuminated corridor!",
    sosActivated: "Emergency alert triggered. Please share your location or dial 112.",
    wardLabel: "Circle 20 - Madhapur / Serilingampally, Hyderabad",
  },
  HI: {
    appName: "रास्ता",
    tagline: "आवाज-आधारित नागरिक सुरक्षा मंच",
    reportProblem: "समस्या की शिकायत करें",
    reportProblemSub: "सड़क के गड्ढों और अंधेरे स्थानों की तुरंत शिकायत दर्ज करें",
    safeRoute: "सुरक्षित मार्ग",
    safeRouteSub: "सड़क की समस्याओं से बचने वाला सुरक्षित मार्ग",
    myReports: "मेरी शिकायतें",
    myReportsSub: "अपनी दर्ज शिकायतों की वास्तविक स्थिति देखें",
    voicePromptPlaceholder: "माइक दबाएं या कहें 'गड्ढे की शिकायत दर्ज करें'",
    listening: "आवाज सुनी जा रही है...",
    speakNow: "अपनी भाषा में बोलें...",
    authorityPortal: "वार्ड कमान पोर्टल",
    sosButton: "आपातकालीन एसओएस",
    sosTriggered: "आपातकालीन स्थिति साझा करें",
    sosDesc: "व्हाट्सएप, एसएमएस या 112 कॉल द्वारा अपना स्थान तुरंत भेजें।",
    fastestRoute: "सीधा मार्ग",
    safestRoute: "सुरक्षित रोशन मार्ग",
    startNavigation: "सुरक्षित नेविगेशन शुरू करें",
    priorityScore: "प्राथमिकता अंक",
    exposureCount: "प्रभावित यात्री",
    slaTimer: "मरम्मत समय सीमा",
    verifyFix: "मरम्मत की जांच करें",
    reportSuccess: "शिकायत सफलतापूर्वक दर्ज की गई। ट्रैकिंग आईडी है",
    navStart: "सुरक्षित मार्ग नेविगेशन शुरू हो रहा है",
    navArrived: "आप सुरक्षित गलियारे से अपने गंतव्य पर पहुँच गए हैं!",
    sosActivated: "आपातकालीन अलर्ट सक्रिय। कृपया स्थान साझा करें या 112 डायल करें।",
    wardLabel: "सर्किल 20 - माधापुर / सेरिलिंगमपल्ली, हैदराबाद",
  },
  TE: {
    appName: "రాస్తా",
    tagline: "వాయిస్ ఆధారిత పౌర భద్రత వేదిక",
    reportProblem: "సమస్యను నివేదించండి",
    reportProblemSub: "రోడ్డు గుంతలు, విద్యుత్ దీపాల సమస్యలను తక్షణమే నివేదించండి",
    safeRoute: "సురక్షిత మార్గం",
    safeRouteSub: "చీకటి ప్రదేశాలను తప్పించే సురక్షిత వెలుతురు మార్గం",
    myReports: "నా నివేదికలు",
    myReportsSub: "మీరు నివేదించిన సమస్యల పరిష్కార పురోగతిని చూడండి",
    voicePromptPlaceholder: "మైక్ నొక్కండి లేదా 'గుంతను నివేదించండి' అని చెప్పండి",
    listening: "మీ మాట వినబడుతోంది...",
    speakNow: "మీ భాషలో మాట్లాడండి...",
    authorityPortal: "వార్డు కమాండ్ పోర్టల్",
    sosButton: "అత్యవసర SOS",
    sosTriggered: "అత్యవసర లొకేషన్ షేరింగ్",
    sosDesc: "వాట్సాప్, SMS లేదా 112 డైరెక్ట్ కాల్ ద్వారా మీ లొకేషన్ పంపండి.",
    fastestRoute: "నేరు మార్గం",
    safestRoute: "సురక్షిత వెలుతురు కారిడార్",
    startNavigation: "సురక్షిత నావిగేషన్ ప్రారంభించండి",
    priorityScore: "ప్రాధాన్యత స్కోరు",
    exposureCount: "ప్రయాణికుల సంఖ్య",
    slaTimer: "పరిష్కార గడువు",
    verifyFix: "పరిష్కారాన్ని ధృవీకరించండి",
    reportSuccess: "ఫిర్యాదు విజయవంతంగా నమోదు చేయబడింది. ట్రాకింగ్ ఐడి",
    navStart: "సురక్షిత మార్గ నావిగేషన్ ప్రారంభమవుతోంది",
    navArrived: "మీరు సురక్షితమైన వెలుతురు మార్గం ద్వారా మీ గమ్యస్థానానికి చేరుకున్నారు!",
    sosActivated: "అత్యవసర హెచ్చరిక ప్రారంభమైంది. దయచేసి లొకేషన్ షేర్ చేయండి లేదా 112కి కాల్ చేయండి.",
    wardLabel: "సర్కిల్ 20 - మాదాపూర్ / శేరిలింగంపల్లి, హైదరాబాద్",
  },
};
