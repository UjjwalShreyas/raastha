import { NextRequest, NextResponse } from "next/server";
import {
  runPotholeWorkflow,
  parsePotholeWorkflowResult,
  RoboflowAuthError,
  RoboflowTimeoutError,
  RoboflowValidationError,
  RoboflowWorkflowExecutionError,
} from "@/lib/roboflowClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, imageBase64, imageUrl, parameters } = body;

    const inputImage = image || (imageBase64 ? { type: "base64", value: imageBase64 } : null) || (imageUrl ? { type: "url", value: imageUrl } : null);

    if (!inputImage) {
      return NextResponse.json(
        {
          success: false,
          error: "An image input is required. Provide 'image', 'imageBase64', or 'imageUrl'.",
        },
        { status: 400 }
      );
    }

    const rawOutputs = await runPotholeWorkflow(inputImage, {
      parameters,
    });

    const summary = parsePotholeWorkflowResult(rawOutputs);

    return NextResponse.json({
      success: true,
      workflow: "Potholes vpotholes-xbcxz-4w0zz-1-rfdetr-medium-t1 Logic",
      summary,
    });
  } catch (error: any) {
    if (error instanceof RoboflowAuthError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: 401 }
      );
    }

    if (error instanceof RoboflowTimeoutError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: 408 }
      );
    }

    if (error instanceof RoboflowValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: 400 }
      );
    }

    if (error instanceof RoboflowWorkflowExecutionError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.responseBody,
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute Roboflow workflow.",
      },
      { status: 500 }
    );
  }
}
