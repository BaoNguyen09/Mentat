import { useCallback, useMemo, useRef, useState } from "react";

import type { KnowledgeSource } from "@mentat/types";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: {
    transcript: string;
  };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const nextWindow = window as Window & typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };

  return nextWindow.SpeechRecognition ?? nextWindow.webkitSpeechRecognition ?? null;
}

export function useVoiceDictation() {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasVoiceCapture, setHasVoiceCapture] = useState(false);

  const supported = useMemo(
    () => typeof window !== "undefined" && Boolean(getSpeechRecognitionCtor()),
    [],
  );

  const start = useCallback(() => {
    const ctor = getSpeechRecognitionCtor();

    if (!ctor) {
      setError("Browser speech recognition is not available here.");
      return;
    }

    const recognition = new ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let nextTranscript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        nextTranscript += `${event.results[index][0].transcript} `;
      }

      setTranscript(nextTranscript.trim());
      setHasVoiceCapture(true);
    };

    recognition.onerror = (event) => {
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setError(null);
    setIsListening(true);
    recognition.start();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
    setHasVoiceCapture(false);
  }, []);

  const source: KnowledgeSource = hasVoiceCapture ? "voice" : "text";

  return {
    supported,
    isListening,
    transcript,
    setTranscript,
    source,
    error,
    start,
    stop,
    reset,
  };
}
