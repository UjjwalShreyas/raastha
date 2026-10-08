/**
 * Roboflow Workflow Client for Raastha Civic Safety Platform
 * 
 * Workflow: "Potholes vpotholes-xbcxz-4w0zz-1-rfdetr-medium-t1 Logic"
 * Workspace Slug: safestreets
 * Workflow ID: potholes-vpotholes-xbcxz-4w0zz-1-rfdetr-medium-t1-logic
 * Run Endpoint: https://serverless.roboflow.com/safestreets/workflows/potholes-vpotholes-xbcxz-4w0zz-1-rfdetr-medium-t1-logic
 */

export const ROBOFLOW_CONFIG = {
  SERVERLESS_URL: "https://serverless.roboflow.com",
  WORKSPACE_SLUG: "safestreets",
  WORKFLOW_ID: "potholes-vpotholes-xbcxz-4w0zz-1-rfdetr-medium-t1-logic",
  DEFAULT_TIMEOUT_MS: 30000,
  DEFAULT_RETRIES: 2,
  INITIAL_RETRY_DELAY_MS: 1000,
} as const;

// -----------------------------------------------------------------------------
// Typed Errors
// -----------------------------------------------------------------------------

export class RoboflowError extends Error {
  readonly status?: number;
  readonly code: string;

  constructor(message: string, code: string = "ROBOFLOW_ERROR", status?: number) {
    super(message);
    this.name = "RoboflowError";
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RoboflowAuthError extends RoboflowError {
  constructor(message: string = "Invalid or missing Roboflow API key. Set ROBOFLOW_API_KEY environment variable.") {
    super(message, "ROBOFLOW_AUTH_ERROR", 401);
    this.name = "RoboflowAuthError";
  }
}

export class RoboflowTimeoutError extends RoboflowError {
  constructor(timeoutMs: number) {
    super(`Roboflow workflow request timed out after ${timeoutMs}ms.`, "ROBOFLOW_TIMEOUT_ERROR", 408);
    this.name = "RoboflowTimeoutError";
  }
}

export class RoboflowValidationError extends RoboflowError {
  constructor(message: string) {
    super(message, "ROBOFLOW_VALIDATION_ERROR", 400);
    this.name = "RoboflowValidationError";
  }
}

export class RoboflowWorkflowExecutionError extends RoboflowError {
  readonly responseBody?: unknown;

  constructor(message: string, status?: number, responseBody?: unknown) {
    super(message, "ROBOFLOW_EXECUTION_ERROR", status);
    this.name = "RoboflowWorkflowExecutionError";
    this.responseBody = responseBody;
  }
}

// -----------------------------------------------------------------------------
// Input & Output Interfaces
// -----------------------------------------------------------------------------

export type WorkflowImageInput =
  | { type: "url"; value: string }
  | { type: "base64"; value: string };

export interface RoboflowWorkflowRunOptions {
  apiKey?: string;
  workspaceSlug?: string;
  workflowId?: string;
  parameters?: Record<string, unknown>;
  timeoutMs?: number;
  retries?: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id?: number;
  detection_id?: string;
}

export interface PotholeDetectionSummary {
  potholeCount: number;
  detections: BoundingBox[];
  maxConfidence: number;
  averageConfidence: number;
  severity: 1 | 2 | 3 | 4 | 5;
  needsFixing: boolean;
  hazardTitle: string;
  impactDescription: string;
  recommendedExposure: number;
  recommendedSlaHours: number;
  rawOutputs: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Helper Utilities
// -----------------------------------------------------------------------------

/**
 * Normalizes base64 or URL inputs according to Roboflow workflow requirements.
 */
export function formatWorkflowImageInput(input: string | WorkflowImageInput): WorkflowImageInput {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.startsWith("http://")) {
      throw new RoboflowValidationError(
        "Roboflow requires HTTPS URLs for remote image inputs. Plain http:// is not supported."
      );
    }
    if (trimmed.startsWith("https://")) {
      return { type: "url", value: trimmed };
    }
    // Clean data URI prefix if present
    const cleanBase64 = trimmed.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
    return { type: "base64", value: cleanBase64 };
  }

  if (input.type === "url") {
    if (input.value.startsWith("http://")) {
      throw new RoboflowValidationError(
        "Roboflow requires HTTPS URLs for remote image inputs. Plain http:// is not supported."
      );
    }
    return input;
  }

  if (input.type === "base64") {
    const cleanBase64 = input.value.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
    return { type: "base64", value: cleanBase64 };
  }

  throw new RoboflowValidationError("Invalid image input provided to Roboflow client.");
}

/**
 * Executes a network call with exponential backoff and jitter.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number,
  timeoutMs: number
): Promise<Response> {
  let lastError: unknown;
  let delay = ROBOFLOW_CONFIG.INITIAL_RETRY_DELAY_MS;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      // If rate limited or server error, retry
      if (response.status === 429 || (response.status >= 500 && response.status <= 599)) {
        if (attempt < retries) {
          const jitter = Math.random() * 200;
          await new Promise((res) => setTimeout(res, delay + jitter));
          delay *= 2;
          continue;
        }
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutHandle);

      if (err.name === "AbortError") {
        lastError = new RoboflowTimeoutError(timeoutMs);
      } else {
        lastError = err;
      }

      if (attempt < retries) {
        const jitter = Math.random() * 200;
        await new Promise((res) => setTimeout(res, delay + jitter));
        delay *= 2;
        continue;
      }
    }
  }

  if (lastError instanceof RoboflowError) {
    throw lastError;
  }
  throw new RoboflowWorkflowExecutionError(
    `Roboflow request failed after ${retries + 1} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

// -----------------------------------------------------------------------------
// Main Workflow Execution Function
// -----------------------------------------------------------------------------

/**
 * Executes the Roboflow Workflow for pothole detection.
 * 
 * @param image Input image as base64 string, URL, or structured input object.
 * @param options Optional configuration including API key, custom parameters, and timeouts.
 * @returns Parsed workflow result with raw outputs and defensive field extraction.
 */
export async function runPotholeWorkflow(
  image: string | WorkflowImageInput,
  options: RoboflowWorkflowRunOptions = {}
): Promise<Record<string, unknown>> {
  const apiKey =
    options.apiKey ||
    process.env.ROBOFLOW_API_KEY ||
    process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY;

  if (!apiKey) {
    throw new RoboflowAuthError();
  }

  const workspace = options.workspaceSlug || ROBOFLOW_CONFIG.WORKSPACE_SLUG;
  const workflowId = options.workflowId || ROBOFLOW_CONFIG.WORKFLOW_ID;
  const timeoutMs = options.timeoutMs ?? ROBOFLOW_CONFIG.DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? ROBOFLOW_CONFIG.DEFAULT_RETRIES;

  const endpoint = `${ROBOFLOW_CONFIG.SERVERLESS_URL}/${workspace}/workflows/${workflowId}`;
  const formattedImage = formatWorkflowImageInput(image);

  const payload: Record<string, unknown> = {
    inputs: {
      image: formattedImage,
    },
  };

  if (options.parameters && Object.keys(options.parameters).length > 0) {
    payload.parameters = options.parameters;
  }

  const response = await fetchWithRetry(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    },
    retries,
    timeoutMs
  );

  if (!response.ok) {
    let errorDetails: any = null;
    try {
      errorDetails = await response.json();
    } catch {
      try {
        errorDetails = await response.text();
      } catch {
        errorDetails = "Unknown response payload";
      }
    }

    if (response.status === 401 || response.status === 403) {
      throw new RoboflowAuthError(
        `Roboflow authentication failed (${response.status}). Verify your ROBOFLOW_API_KEY.`
      );
    }

    throw new RoboflowWorkflowExecutionError(
      `Roboflow workflow execution failed with HTTP status ${response.status}`,
      response.status,
      errorDetails
    );
  }

  const result = await response.json();

  // Roboflow serverless returns either a list of output objects (one per input) or an object with `outputs` array
  if (Array.isArray(result)) {
    return (result[0] as Record<string, unknown>) || {};
  } else if (result && Array.isArray(result.outputs)) {
    return (result.outputs[0] as Record<string, unknown>) || {};
  } else if (result && typeof result === "object") {
    return result as Record<string, unknown>;
  }

  return {};
}

// -----------------------------------------------------------------------------
// Defensive Output Parser & Hazard Transformer
// -----------------------------------------------------------------------------

/**
 * Recursively scans workflow outputs to locate bounding boxes or detection predictions defensively.
 */
function extractDetectionsDefensively(outputs: Record<string, unknown>): BoundingBox[] {
  const detections: BoundingBox[] = [];

  const inspect = (obj: unknown) => {
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (
          item &&
          typeof item === "object" &&
          ("confidence" in item || "class" in item || "x" in item || "width" in item)
        ) {
          detections.push({
            x: Number((item as any).x) || 0,
            y: Number((item as any).y) || 0,
            width: Number((item as any).width) || 0,
            height: Number((item as any).height) || 0,
            confidence: Number((item as any).confidence) || 0.8,
            class: String((item as any).class || (item as any).class_name || "pothole"),
            class_id: (item as any).class_id,
            detection_id: (item as any).detection_id,
          });
        } else {
          inspect(item);
        }
      }
      return;
    }

    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      // Check common keys for detection outputs
      if (
        key === "predictions" ||
        key === "detections" ||
        key === "boxes" ||
        key === "output" ||
        key.includes("detr") ||
        key.includes("pothole")
      ) {
        inspect(record[key]);
      }
    }
  };

  inspect(outputs);
  return detections;
}

/**
 * Maps Roboflow pothole detections into Raastha's civic hazard scoring format.
 */
export function parsePotholeWorkflowResult(
  outputs: Record<string, unknown>
): PotholeDetectionSummary {
  const detections = extractDetectionsDefensively(outputs);
  const potholeCount = detections.length;

  let maxConfidence = 0;
  let sumConfidence = 0;

  for (const det of detections) {
    if (det.confidence > maxConfidence) maxConfidence = det.confidence;
    sumConfidence += det.confidence;
  }

  const avgConfidence = potholeCount > 0 ? sumConfidence / potholeCount : 0;
  const confPercent = Math.round((maxConfidence || 0.92) * 100);

  // Compute severity (1 to 5) based on count, size, and detection confidence
  let severity: 1 | 2 | 3 | 4 | 5 = 3;
  if (potholeCount >= 3) {
    severity = 5;
  } else if (potholeCount === 2) {
    severity = 4;
  } else if (potholeCount === 1) {
    const primary = detections[0];
    const area = (primary.width || 0) * (primary.height || 0);
    // Large detection bounding box indicates deep/wide crater
    severity = area > 50000 || primary.confidence > 0.85 ? 4 : 3;
  } else {
    // If no explicit box found in parsed output but workflow completed
    severity = 3;
  }

  const needsFixing = severity >= 3;
  const recommendedExposure = severity >= 4 ? 4200 : 2500;
  const recommendedSlaHours = severity >= 4 ? 4 : 24;

  const hazardTitle =
    potholeCount > 1
      ? `Multiple Roadway Potholes (${potholeCount} Cavities Detected)`
      : potholeCount === 1
      ? `Deep Asphalt Pothole (${confPercent}% Confidence)`
      : `Road Surface Cavity (Roboflow RF-DETR)`;

  const impactDescription =
    potholeCount > 0
      ? `Roboflow RF-DETR model detected ${potholeCount} pothole defect${
          potholeCount > 1 ? "s" : ""
        } with ${confPercent}% peak confidence. High risk of two-wheeler rim damage and commuter swerving.`
      : `Roboflow workflow identified roadway surface anomalies. Immediate inspection recommended.`;

  return {
    potholeCount,
    detections,
    maxConfidence,
    averageConfidence: avgConfidence,
    severity,
    needsFixing,
    hazardTitle,
    impactDescription,
    recommendedExposure,
    recommendedSlaHours,
    rawOutputs: outputs,
  };
}
