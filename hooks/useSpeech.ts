"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Support both standard SpeechRecognition and WebKit prefix
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultListLike {
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem;
    isFinal: boolean;
  };
  length: number;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function useSpeech() {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [supported, setSupported] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionClass =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        setSupported(true);
        try {
          const instance = new SpeechRecognitionClass();
          instance.continuous = true;
          instance.interimResults = true;

          instance.onresult = (event: SpeechRecognitionEventLike) => {
            let currentText = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const res = event.results[i];
              if (res && res[0]) {
                currentText += res[0].transcript;
              }
            }
            if (currentText) {
              setTranscript(currentText);
            }
          };

          instance.onerror = (event: SpeechRecognitionErrorEvent) => {
            if (event.error === "not-allowed") {
              setSpeechNotice("Microphone permission denied. Please allow microphone access or use text fallback.");
            } else if (event.error !== "no-speech") {
              console.warn("Speech recognition notice:", event.error);
            }
            setIsListening(false);
          };

          instance.onend = () => {
            setIsListening(false);
          };

          recognitionRef.current = instance;
        } catch (e) {
          console.warn("Failed to initialize speech recognition:", e);
          setSupported(false);
        }
      } else {
        setSupported(false);
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
  }, []);

  const startListening = useCallback(
    (langCode: string = "en-IN") => {
      if (!supported || !recognitionRef.current) {
        setSpeechNotice("Speech recognition is not supported in this browser. Please use keyboard input.");
        return;
      }

      // Map language code to Indian locales
      let targetLang = "en-IN";
      if (langCode === "EN" || langCode === "en-IN" || langCode === "en-US") targetLang = "en-IN";
      if (langCode === "HI" || langCode === "hi-IN") targetLang = "hi-IN";
      if (langCode === "TE" || langCode === "te-IN") targetLang = "te-IN";

      try {
        setTranscript("");
        setSpeechNotice(null);
        recognitionRef.current.lang = targetLang;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Speech recognition start notice:", err);
      }
    },
    [supported]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  const speak = useCallback(
    (text: string, langCode: string = "en-IN") => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        console.warn("Speech Synthesis not supported in this browser.");
        return;
      }

      try {
        window.speechSynthesis.cancel(); // Cancel ongoing speech

        const utterance = new SpeechSynthesisUtterance(text);
        let targetLang = "en-IN";
        if (langCode === "EN" || langCode === "en-IN") targetLang = "en-IN";
        if (langCode === "HI" || langCode === "hi-IN") targetLang = "hi-IN";
        if (langCode === "TE" || langCode === "te-IN") targetLang = "te-IN";

        utterance.lang = targetLang;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        // Try to pick matching Indian voice if available in OS
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(
          (v) => v.lang === targetLang || v.lang.startsWith(targetLang.split("-")[0])
        );
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Error triggering speech synthesis:", e);
        setIsSpeaking(false);
      }
    },
    []
  );

  return {
    isListening,
    transcript,
    setTranscript,
    supported,
    isSpeaking,
    speechNotice,
    setSpeechNotice,
    startListening,
    stopListening,
    speak,
  };
}
