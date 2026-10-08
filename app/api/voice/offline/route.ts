import { NextRequest, NextResponse } from "next/server";

const VOSK_SERVICE_URL = process.env.VOSK_SERVICE_URL || "http://127.0.0.1:5001";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Forward raw audio or JSON payload to the Python Vosk server
    let bodyData: BodyInit;
    let forwardHeaders: Record<string, string> = {};

    if (contentType.includes("application/json")) {
      const json = await req.json();
      bodyData = JSON.stringify(json);
      forwardHeaders["Content-Type"] = "application/json";
    } else {
      const buffer = await req.arrayBuffer();
      bodyData = buffer;
      forwardHeaders["Content-Type"] = "audio/wav";
    }

    const response = await fetch(`${VOSK_SERVICE_URL}/transcribe`, {
      method: "POST",
      headers: forwardHeaders,
      body: bodyData,
      // 10 second timeout for STT transcription
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `Vosk server error: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Vosk microservice connection failed";
    return NextResponse.json(
      {
        success: false,
        error: "Could not reach local Vosk STT service. Ensure `python services/voice_service.py` is running on port 5001.",
        details: message,
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  try {
    const res = await fetch(`${VOSK_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ online: true, ...data });
    }
  } catch {
    // service not running
  }
  return NextResponse.json(
    {
      online: false,
      message: "Vosk offline STT service is not running on port 5001",
    },
    { status: 503 }
  );
}
