/**
 * Smoke Test for Roboflow Workflow Client & Response Parser
 * 
 * Verifies:
 * 1. Image input formatting & validation (HTTPS vs HTTP rejection, base64 stripping).
 * 2. Typed error handling (RoboflowAuthError, RoboflowValidationError, etc.).
 * 3. Workflow output defensive parsing and civic hazard metric calculation.
 * 4. Bounding box / detection handling and memory-safe formatting.
 */

import {
  formatWorkflowImageInput,
  parsePotholeWorkflowResult,
  runPotholeWorkflow,
  RoboflowAuthError,
  RoboflowValidationError,
  ROBOFLOW_CONFIG,
} from "../lib/roboflowClient";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runSmokeTests() {
  console.log("🚀 Starting Roboflow Workflow Integration Smoke Tests...\n");

  // ---------------------------------------------------------------------------
  // Test 1: Configuration Constants
  // ---------------------------------------------------------------------------
  console.log("➡️ Test 1: Validating Workflow Configuration Constants");
  assert(
    ROBOFLOW_CONFIG.WORKSPACE_SLUG === "safestreets",
    "Expected workspace slug to be 'safestreets'"
  );
  assert(
    ROBOFLOW_CONFIG.WORKFLOW_ID === "potholes-vpotholes-xbcxz-4w0zz-1-rfdetr-medium-t1-logic",
    "Expected workflow ID to match 'potholes-vpotholes-xbcxz-4w0zz-1-rfdetr-medium-t1-logic'"
  );
  console.log("✅ Configuration constants verified.\n");

  // ---------------------------------------------------------------------------
  // Test 2: Input Normalization and HTTPS Enforcement
  // ---------------------------------------------------------------------------
  console.log("➡️ Test 2: Input Normalization & Security Rules");

  // 2a. Rejection of insecure http URL
  let rejectedHttp = false;
  try {
    formatWorkflowImageInput("http://insecure-domain.com/pothole.jpg");
  } catch (err) {
    if (err instanceof RoboflowValidationError) {
      rejectedHttp = true;
    }
  }
  assert(rejectedHttp, "Roboflow client must reject plain http:// URLs");

  // 2b. Valid https URL
  const httpsResult = formatWorkflowImageInput("https://images.example.com/pothole.jpg");
  assert(httpsResult.type === "url", "Expected type 'url'");
  assert(
    httpsResult.value === "https://images.example.com/pothole.jpg",
    "Expected correct URL string"
  );

  // 2c. Base64 stripping
  const rawBase64 = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const base64Result = formatWorkflowImageInput(rawBase64);
  assert(base64Result.type === "base64", "Expected type 'base64'");
  assert(
    !base64Result.value.startsWith("data:image"),
    "Expected data URL header to be stripped"
  );
  console.log("✅ Input normalization and validation verified.\n");

  // ---------------------------------------------------------------------------
  // Test 3: Missing API Key Error Guarantee
  // ---------------------------------------------------------------------------
  console.log("➡️ Test 3: Authentication & Error Hierarchy");
  let caughtAuthError = false;
  try {
    // Force empty API key
    await runPotholeWorkflow(
      { type: "base64", value: "test" },
      { apiKey: "" }
    );
  } catch (err) {
    if (err instanceof RoboflowAuthError) {
      caughtAuthError = true;
      assert(err.code === "ROBOFLOW_AUTH_ERROR", "Error code should be ROBOFLOW_AUTH_ERROR");
      assert(err.status === 401, "Error status should be 401");
    }
  }
  assert(caughtAuthError, "Client must throw RoboflowAuthError when API key is missing");
  console.log("✅ Typed error handling verified.\n");

  // ---------------------------------------------------------------------------
  // Test 4: Defensive Parsing of Workflow Real Response Payload
  // ---------------------------------------------------------------------------
  console.log("➡️ Test 4: Defensive Parsing of Workflow Detections & Metrics");

  // Simulate real Roboflow Workflow response structure with RF-DETR detections
  const mockWorkflowResponse = {
    predictions: [
      {
        x: 320.5,
        y: 240.0,
        width: 180.2,
        height: 120.4,
        confidence: 0.942,
        class: "pothole",
        class_id: 0,
        detection_id: "det-001",
      },
      {
        x: 150.0,
        y: 190.0,
        width: 90.0,
        height: 65.0,
        confidence: 0.887,
        class: "pothole",
        class_id: 0,
        detection_id: "det-002",
      },
    ],
    visualization: "data:image/jpeg;base64,sample_blob_not_logged",
  };

  const parsed = parsePotholeWorkflowResult(mockWorkflowResponse);

  assert(parsed.potholeCount === 2, "Expected 2 detected potholes");
  assert(parsed.severity === 4, "2 potholes should calculate severity 4");
  assert(parsed.needsFixing === true, "Severity 4 must require urgent fixing");
  assert(parsed.maxConfidence >= 0.94, "Max confidence should be >= 0.94");
  assert(parsed.detections.length === 2, "Detections list length should be 2");
  assert(parsed.recommendedExposure === 4200, "Severe hazard should have 4200 commuter exposure");
  assert(parsed.recommendedSlaHours === 4, "Severe hazard should recommend 4h SLA");
  assert(
    parsed.hazardTitle.includes("Multiple Roadway Potholes"),
    "Hazard title should indicate multiple potholes"
  );
  console.log("✅ Defensive output parsing verified with real detection structure.\n");

  // ---------------------------------------------------------------------------
  // Test 5: Single Severe Pothole Parsing
  // ---------------------------------------------------------------------------
  console.log("➡️ Test 5: Single Deep Pothole Parsing");
  const singlePotholeResponse = {
    predictions: [
      {
        x: 200,
        y: 200,
        width: 300,
        height: 200,
        confidence: 0.965,
        class: "pothole",
      },
    ],
  };

  const singleParsed = parsePotholeWorkflowResult(singlePotholeResponse);
  assert(singleParsed.potholeCount === 1, "Expected 1 pothole");
  assert(singleParsed.severity === 4, "Deep large pothole should have severity 4");
  assert(singleParsed.needsFixing === true, "Must need fixing");
  assert(singleParsed.hazardTitle.includes("97% Confidence") || singleParsed.hazardTitle.includes("Deep Asphalt Pothole"), "Hazard title formatted");
  console.log("✅ Single pothole calculation verified.\n");

  console.log("🎉 ALL SMOKE TESTS PASSED SUCCESSFULLY! 🚀");
}

runSmokeTests().catch((err) => {
  console.error("❌ Smoke test failed:", err);
  process.exit(1);
});
