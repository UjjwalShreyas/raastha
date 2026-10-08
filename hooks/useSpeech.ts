"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WavAudioRecorder, transcribeWithVosk } from "@/lib/audioRecorder";

export type VoiceLocale = "en-IN" | "hi-IN" | "te-IN";

/**
 * Maps app language codes (EN, HI, TE) to standard Indian BCP-47 locale tags.
 */
export function getLocale(langCode: string): VoiceLocale {
  const upper = (langCode || "EN").toUpperCase();
  if (upper === "HI" || upper === "HI-IN") return "hi-IN";
  if (upper === "TE" || upper === "TE-IN") return "te-IN";
  return "en-IN";
}

/**
 * Maps recognition error codes to clear, friendly user notifications.
 */
export function mapRecognitionError(error: string): string {
  switch (error) {
    case "not-allowed":
      return "Microphone permission denied. Please allow microphone access in your browser settings.";
    case "no-speech":
      return "No speech was detected. Please try speaking again.";
    case "language-not-supported":
      return "Speech recognition is not supported for this language on your device.";
    case "network":
      return "Network connection issue during speech recognition.";
    default:
      return `Voice recognition notice: ${error}`;
  }
}

export type MicPermissionStatus = "idle" | "granted" | "denied" | "unsupported";

/**
 * Proactively requests microphone permission from the browser and immediately releases the media tracks.
 */
export async function requestMicrophonePermission(): Promise<MicPermissionStatus> {
  if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
    return "unsupported";
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Immediately release microphone stream so the recording light does not stay on
    stream.getTracks().forEach((track) => track.stop());
    return "granted";
  } catch (err: any) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return "denied";
    }
    return "denied";
  }
}

export interface UseRecognitionOptions {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
}

export interface UseRecognitionReturn {
  start: () => void;
  stop: () => void;
  listening: boolean;
  supported: boolean;
  isProcessing: boolean;
  error: string | null;
}

/**
 * Hook providing SpeechRecognition + local Vosk offline model transcription.
 * Concurrently captures real-time speech and automatically processes completed sentences via Vosk.
 */
export function useRecognition(
  lang: string,
  options?: UseRecognitionOptions
): UseRecognitionReturn {
  const [listening, setListening] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [supported, setSupported] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<WavAudioRecorder | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const capturedInterimRef = useRef<string>("");
  const targetLocale = getLocale(lang);

  // Setup Web Speech API for real-time interim display
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        const recognizer = new SpeechRecognitionClass();
        recognizer.continuous = false;
        recognizer.interimResults = true;
        recognizer.lang = targetLocale;

        recognizer.onresult = (event: any) => {
          let interimText = "";
          let finalText = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              finalText += item[0].transcript;
            } else {
              interimText += item[0].transcript;
            }
          }

          if (interimText) {
            capturedInterimRef.current = interimText;
            optionsRef.current?.onInterim?.(interimText);
          }
          if (finalText) {
            capturedInterimRef.current = finalText;
            optionsRef.current?.onInterim?.(finalText);
          }
        };

        recognizer.onerror = (event: any) => {
          if (event.error !== "no-speech") {
            const msg = mapRecognitionError(event.error);
            setError(msg);
          }
        };

        recognitionRef.current = recognizer;
      } catch {
        // Fallback exclusively to Vosk Audio recorder
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [targetLocale]);

  // Stop recording and process completed sentence through Vosk
  const stopAndProcess = useCallback(async () => {
    setListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (recorderRef.current) {
      setIsProcessing(true);
      try {
        const wavBlob = await recorderRef.current.stop();
        if (wavBlob && wavBlob.size > 1000) {
          // Send to Vosk offline transcription endpoint
          const voskRes = await transcribeWithVosk(wavBlob);
          if (voskRes.success && voskRes.text) {
            optionsRef.current?.onFinal?.(voskRes.text);
            setIsProcessing(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Vosk transcription notice:", err);
      } finally {
        setIsProcessing(false);
      }
    }

    // Fallback to interim text if Vosk was offline or returned empty
    const fallbackText = capturedInterimRef.current.trim();
    if (fallbackText) {
      optionsRef.current?.onFinal?.(fallbackText);
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    capturedInterimRef.current = "";

    try {
      // 1. Initialize 16kHz WAV Audio Recorder for Vosk
      const recorder = new WavAudioRecorder({
        onSilenceDetected: () => {
          // Auto-stop and transcribe when sentence finishes
          stopAndProcess();
        },
      });

      await recorder.start();
      recorderRef.current = recorder;
      setListening(true);

      // 2. Start Web Speech for interim real-time streaming
      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = targetLocale;
          recognitionRef.current.start();
        } catch {
          // ignore if already active or unsupported
        }
      }
    } catch (err: any) {
      setListening(false);
      setError("Microphone permission needed to use voice commands.");
    }
  }, [targetLocale, stopAndProcess]);

  const stop = useCallback(() => {
    stopAndProcess();
  }, [stopAndProcess]);

  return {
    start,
    stop,
    listening,
    isProcessing,
    supported,
    error,
  };
}

/**
 * Finds a matching voice installed on the device for the given language.
 */
export function getMatchingVoice(langCode: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const targetLocale = getLocale(langCode).toLowerCase(); // "en-in", "hi-in", "te-in"
  const langPrefix = targetLocale.split("-")[0]; // "en", "hi", "te"

  // 1. Exact match e.g. "te-in" or "hi-in"
  const exact = voices.find(
    (v) => v.lang.toLowerCase().replace("_", "-") === targetLocale
  );
  if (exact) return exact;

  // 2. Prefix match e.g. "te" or "hi"
  const prefix = voices.find((v) => {
    const vLang = v.lang.toLowerCase().replace("_", "-");
    return vLang.startsWith(langPrefix);
  });
  if (prefix) return prefix;

  return null;
}

/**
 * speak(text, lang)
 * Returns false if the device has no voice for that language or if synthesis fails.
 * Callers must pass already-translated text via t(), and show the same text as a toast when speak() returns false.
 */
export function speak(text: string, lang: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  const matchingVoice = getMatchingVoice(lang);
  if (!matchingVoice) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = matchingVoice;
    utterance.lang = matchingVoice.lang;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn("Speech synthesis notice:", err);
    return false;
  }
}
