"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access denied",
  "no-speech": "No speech detected. Try again.",
  "audio-capture": "No microphone found",
  "network": "Network error",
};

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in (window as any));

  const getRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    if (!isSupported) return null;

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) setTranscript(finalText);
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event: any) => {
      setError(ERROR_MESSAGES[event.error] ?? "Speech recognition error");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [isSupported]);

  const start = useCallback(() => {
    const recognition = getRecognition();
    if (!recognition) return;
    setError(null);
    setTranscript("");
    setInterimTranscript("");
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // Already started — ignore
    }
  }, [getRecognition]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, [stop]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  };
}
