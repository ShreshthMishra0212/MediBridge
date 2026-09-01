import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useVoiceInput — Web Speech API Speech-to-Text hook
 * Allows patients and doctors to speak their symptoms, clinical notes, or queries
 * in English or Hindi (hi-IN / en-IN) with live transcript feedback.
 */
export const useVoiceInput = ({ onTranscript, lang = "en-IN" } = {}) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onresult = (event) => {
        let finalStr = "";
        let interimStr = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript;
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }

        if (finalStr) {
          setTranscript((prev) => {
            const next = prev ? `${prev} ${finalStr.trim()}` : finalStr.trim();
            if (onTranscript) onTranscript(next);
            return next;
          });
          setInterimTranscript("");
        } else {
          setInterimTranscript(interimStr);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          setError(`Microphone error: ${event.error}`);
          setListening(false);
        }
      };

      recognition.onend = () => {
        setListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [lang, onTranscript]);

  const startListening = useCallback(() => {
    setError("");
    if (recognitionRef.current && !listening) {
      try {
        recognitionRef.current.lang = lang;
        recognitionRef.current.start();
        setListening(true);
      } catch (err) {
        console.error("Failed to start voice recognition:", err);
      }
    }
  }, [listening, lang]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      setListening(false);
    }
  }, [listening]);

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    listening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    setTranscript,
  };
};
