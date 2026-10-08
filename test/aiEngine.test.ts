import {
  ClassifyOutputSchema,
  ClarifyOutputSchema,
  IntentOutputSchema,
  ExplainRouteOutputSchema,
  VerifyFixOutputSchema,
} from "../lib/ai/schemas";
import { postValidateDigits, buildTemplateRouteExplanation } from "../app/api/ai/explain-route/route";
import { matchKeywordIntent } from "../app/api/ai/intent/route";
import {
  calculatePriorityScore,
  calculateSafetyScore,
  calculateSlaHours,
  estimateCommuterExposure,
  isFixAcceptable,
} from "../lib/scoring";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

console.log("\n=======================================================");
console.log("🛡️ RAASTHA AI ENGINE - COMPREHENSIVE TEST SUITE");
console.log("=======================================================\n");

// -----------------------------------------------------------------------------
// 1. Zod Schema Verification
// -----------------------------------------------------------------------------
console.log("1. Testing Zod Schemas & Validation Contracts...");

try {
  const validClassify = ClassifyOutputSchema.parse({
    type: "pothole",
    severity: 4,
    confidence: 0.95,
    hazard_for: ["two_wheelers", "pedestrians"],
    description_en: "Deep asphalt cavity in arterial lane",
    description_local: "सड़क पर गहरा गड्ढा है",
    looks_authentic: true,
    reasoning_short: "Visible asphalt fracture and depth",
  });
  assert(validClassify.type === "pothole" && validClassify.severity === 4, "ClassifyOutputSchema validates authentic pothole");
} catch (e: any) {
  assert(false, `ClassifyOutputSchema threw error: ${e.message}`);
}

try {
  // Invalid severity (must be 1..5)
  ClassifyOutputSchema.parse({
    type: "pothole",
    severity: 7 as any, // Invalid
    confidence: 0.9,
    hazard_for: ["cars"],
    description_en: "test",
    description_local: "test",
    looks_authentic: true,
    reasoning_short: "test",
  });
  assert(false, "ClassifyOutputSchema should reject severity > 5");
} catch {
  assert(true, "ClassifyOutputSchema correctly rejected severity > 5");
}

try {
  const validIntent = IntentOutputSchema.parse({
    intent: "find_safe_route",
    fields: { destination: "Indiranagar 100 Feet Road" },
    language: "en",
    reply_local: "Finding illuminated route to Indiranagar.",
  });
  assert(validIntent.intent === "find_safe_route" && validIntent.fields.destination === "Indiranagar 100 Feet Road", "IntentOutputSchema parses navigation destination");
} catch (e: any) {
  assert(false, `IntentOutputSchema threw error: ${e.message}`);
}

try {
  const validFix = VerifyFixOutputSchema.parse({
    fixed: "true",
    confidence: 0.92,
    note: "Pothole cleanly leveled with hot bitumen asphalt",
    same_location_likely: true,
  });
  assert(validFix.fixed === "true" && validFix.same_location_likely === true, "VerifyFixOutputSchema validates repaired road patch");
} catch (e: any) {
  assert(false, `VerifyFixOutputSchema threw error: ${e.message}`);
}

// -----------------------------------------------------------------------------
// 2. Deterministic Scoring Ground Rules
// -----------------------------------------------------------------------------
console.log("\n2. Testing Deterministic Scoring Formulas (AI Never Decides Scores)...");

const priorityVal = calculatePriorityScore(4, 3500);
assert(priorityVal === 140, `calculatePriorityScore produces exact formula output (Expected: 140, Got: ${priorityVal})`);

const slaHours = calculateSlaHours(4);
assert(slaHours === 4, `Severity 4 gives 4 hour SLA (Got: ${slaHours})`);

const exposure = estimateCommuterExposure("arterial");
assert(exposure === 4200, `Arterial road gives 4200 commuter proxy (Got: ${exposure})`);

const safetyIndex = calculateSafetyScore([
  { severity: 4, distanceToRouteMeters: 10 },
  { severity: 2, distanceToRouteMeters: 50 },
]);
assert(safetyIndex >= 10 && safetyIndex <= 99, `Route safety score clamped cleanly between 10 and 99 (Got: ${safetyIndex})`);

// -----------------------------------------------------------------------------
// 3. Digit Post-Validation (Route Explanations)
// -----------------------------------------------------------------------------
console.log("\n3. Testing Route Reason Post-Validation & Hallucination Guard...");

const allowedDigits = new Set([14, 10, 94, 68, 2, 4]); // Minutes, score, facts
const validExplanation = "Takes 14 minutes, avoiding 2 broken streetlights past 4 open shops.";
const hallucinatedExplanation = "Takes 14 minutes, avoiding 99 broken streetlights and 500 potholes.";

assert(postValidateDigits(validExplanation, allowedDigits) === true, "postValidateDigits approves valid matching numbers");
assert(postValidateDigits(hallucinatedExplanation, allowedDigits) === false, "postValidateDigits rejects hallucinated numbers (99, 500)");

const fallbackTemplate = buildTemplateRouteExplanation(
  [{ kind: "open_shops", count: 4 }],
  [{ kind: "broken_streetlight", count: 2 }],
  "en"
);
assert(fallbackTemplate.safest_reason_local.includes("avoiding 2 unlit sections"), "buildTemplateRouteExplanation generates accurate facts");

// -----------------------------------------------------------------------------
// 4. Keyword Fallback for Voice Intents
// -----------------------------------------------------------------------------
console.log("\n4. Testing Keyword Intent Fallback (Offline/Network Failures)...");

const hinglishRoute = matchKeywordIntent("Bhai mujhe Koramangala ka safe route dikhao", "hi");
assert(hinglishRoute.intent === "find_safe_route", `Hinglish voice route intent identified: ${hinglishRoute.intent}`);

const teluguReport = matchKeywordIntent("ఇక్కడ ఒక పెద్ద గుంత ఉంది రిపోర్ట్ చేయండి", "te");
assert(teluguReport.intent === "report_issue", `Telugu voice hazard report identified: ${teluguReport.intent}`);

const langSwitch = matchKeywordIntent("Change language to Hindi", "en");
assert(langSwitch.intent === "change_language" && langSwitch.fields.language === "hi", `Language change command parsed: ${langSwitch.fields.language}`);

// -----------------------------------------------------------------------------
// 5. Fix Verification Acceptance Rules
// -----------------------------------------------------------------------------
console.log("\n5. Testing Fix Verification Acceptance Rules...");

const approvedFix = isFixAcceptable("true", 0.88, true);
assert(approvedFix.acceptable === true, "Accepts verified fix with confidence >= 0.7 and same location");

const lowConfidenceFix = isFixAcceptable("true", 0.55, true);
assert(lowConfidenceFix.acceptable === false, "Routes low confidence fix (< 0.7) to human review");

const differentLocationFix = isFixAcceptable("true", 0.95, false);
assert(differentLocationFix.acceptable === false, "Rejects fix if same_location_likely is false");

const uncertainFix = isFixAcceptable("uncertain", 0.90, true);
assert(uncertainFix.acceptable === false, "Routes 'uncertain' fix status to human review");

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("\n=======================================================");
console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
