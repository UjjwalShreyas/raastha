"""
Raastha AI - Offline Vosk Speech-to-Text Microservice
Loads the local Vosk model and provides both CLI and HTTP API for offline audio transcription.
"""

import os
import sys
import json
import wave
import io
from http.server import HTTPServer, BaseHTTPRequestHandler

# 1. Base path to Vosk model
DEFAULT_MODEL_PATH = os.environ.get(
    "VOSK_MODEL_PATH",
    r"C:\Users\Mitul Nayakwadi\OneDrive\Documents\vosk-model-small-en-us-0.15"
)

def resolve_model_path(base_path: str) -> str:
    """Auto-detects nested unzip directory if needed."""
    if not os.path.exists(base_path):
        return base_path
    
    # Check if 'am' or 'conf' or 'graph' exists in base_path
    if os.path.exists(os.path.join(base_path, "conf")) or os.path.exists(os.path.join(base_path, "am")):
        return base_path

    # Check for nested subfolder with same name
    nested_path = os.path.join(base_path, os.path.basename(base_path.rstrip("\\/")))
    if os.path.exists(nested_path) and (os.path.exists(os.path.join(nested_path, "conf")) or os.path.exists(os.path.join(nested_path, "am"))):
        return nested_path

    # Search first level subdirectories
    for item in os.listdir(base_path):
        sub = os.path.join(base_path, item)
        if os.path.isdir(sub) and (os.path.exists(os.path.join(sub, "conf")) or os.path.exists(os.path.join(sub, "am"))):
            return sub

    return base_path

RESOLVED_MODEL_PATH = resolve_model_path(DEFAULT_MODEL_PATH)

# 2. Check and load Vosk model
try:
    from vosk import Model, KaldiRecognizer, SetLogLevel
    SetLogLevel(-1) # Quiet logging
except ImportError:
    print("\n[!] Error: 'vosk' package is not installed.")
    print("    Please run: pip install vosk\n")
    sys.exit(1)

if not os.path.exists(RESOLVED_MODEL_PATH):
    print(f"\n[!] Error: Could not find Vosk model folder at: {RESOLVED_MODEL_PATH}")
    print("    Please check the path or set VOSK_MODEL_PATH environment variable.\n")
    sys.exit(1)

print(f"[*] Loading Vosk model from: {RESOLVED_MODEL_PATH} ...")
model = Model(RESOLVED_MODEL_PATH)
print("[+] Vosk Model loaded successfully into memory!\n")


def transcribe_wav_stream(wav_bytes: bytes) -> dict:
    """Transcribe in-memory WAV bytes (16kHz 16-bit Mono recommended)."""
    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
            framerate = wf.getframerate()
            rec = KaldiRecognizer(model, framerate)
            rec.SetWords(True)

            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                rec.AcceptWaveform(data)

            res = json.loads(rec.FinalResult())
            return {
                "success": True,
                "text": res.get("text", "").strip(),
                "details": res
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "text": ""
        }


def transcribe_wav_file(file_path: str) -> dict:
    """Transcribe a WAV file from disk."""
    if not os.path.exists(file_path):
        return {"success": False, "error": f"File not found: {file_path}", "text": ""}
    
    with open(file_path, "rb") as f:
        return transcribe_wav_stream(f.read())


class VoskRequestHandler(BaseHTTPRequestHandler):
    """Simple HTTP handler with CORS support for Next.js app communication."""

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/" or self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            response = {
                "status": "ready",
                "service": "Raastha Offline Vosk STT Server",
                "model_path": RESOLVED_MODEL_PATH
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path.startswith("/transcribe"):
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self.send_response(400)
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Empty body"}).encode("utf-8"))
                return

            body = self.rfile.read(content_length)
            content_type = self.headers.get("Content-Type", "")

            # If sent as JSON with filePath
            if "application/json" in content_type:
                try:
                    payload = json.loads(body.decode("utf-8"))
                    file_path = payload.get("filePath")
                    if file_path:
                        result = transcribe_wav_file(file_path)
                    else:
                        result = {"success": False, "error": "Missing filePath"}
                except Exception as ex:
                    result = {"success": False, "error": f"Invalid JSON: {ex}"}
            else:
                # Sent as raw WAV audio bytes
                result = transcribe_wav_stream(body)

            self.send_response(200 if result.get("success") else 400)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()


def run_server(port: int = 5001):
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, VoskRequestHandler)
    print(f"[*] Raastha Offline Vosk STT Microservice running on: http://127.0.0.1:{port}")
    print("    - Health Check: GET  http://127.0.0.1:5001/health")
    print("    - Transcribe:   POST http://127.0.0.1:5001/transcribe (send raw WAV bytes or JSON)")
    print("    - Press Ctrl+C to stop.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[!] Shutting down Vosk server...")
        httpd.server_close()


if __name__ == "__main__":
    # If audio file is passed as CLI argument, transcribe directly
    if len(sys.argv) > 1 and sys.argv[1] != "--server":
        audio_target = sys.argv[1]
        print(f"[*] Transcribing file: {audio_target}")
        res = transcribe_wav_file(audio_target)
        print("\n--- Transcription Result ---")
        print(f"Text: \"{res.get('text')}\"")
        print(f"Success: {res.get('success')}")
    else:
        # Run local HTTP server
        port = 5001
        run_server(port=port)
