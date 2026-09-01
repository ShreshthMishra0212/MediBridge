import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useSpeech — reusable bilingual Text-to-Speech hook
 *
 * Uses the browser SpeechSynthesis API.
 * Supports en-IN and hi-IN voices.
 * Prevents overlapping speech.
 * Auto-stops on unmount / page leave.
 */
export const useSpeech = () => {
  const [speaking, setSpeaking] = useState(false);
  const [currentLang, setCurrentLang] = useState(null);
  const utteranceRef = useRef(null);

  // Cancel any ongoing speech
  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setCurrentLang(null);
    utteranceRef.current = null;
  }, []);

  // Find the best matching voice for a language tag
  const findVoice = useCallback((langTag) => {
    if (!window.speechSynthesis) return null;

    const voices = window.speechSynthesis.getVoices();

    // Prefer Microsoft Kalpana for Hindi
    if (langTag === "hi-IN") {
        const kalpana = voices.find(
            v => v.name.toLowerCase().includes("kalpana")
        );

        if (kalpana) return kalpana;
    }

    // Exact language match
    let voice = voices.find(v => v.lang === langTag);
    if (voice) return voice;

    // Language prefix fallback
    const prefix = langTag.split("-")[0];

    return voices.find(v => v.lang.startsWith(prefix)) || null;
}, []);

  /**
   * speak(text, lang)
   * @param {string} text  — the text to read aloud
   * @param {"en"|"hi"} lang — "en" for English, "hi" for Hindi
   */
  const speak = useCallback(
    (text, lang = "en") => {
      if (!text || !text.trim()) return;

      if (typeof window === "undefined" || !window.speechSynthesis) {
        console.warn("SpeechSynthesis API is not available in this browser.");
        return;
      }

      // Stop any ongoing speech before starting new
      window.speechSynthesis.cancel();

      const langTag = lang === "hi" ? "hi-IN" : "en-IN";
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = langTag;
      utterance.rate = lang === "hi" ? 0.9 : 1;
      utterance.pitch = 1;

      const voice = findVoice(langTag);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        setSpeaking(true);
        setCurrentLang(lang);
      };

      utterance.onend = () => {
        setSpeaking(false);
        setCurrentLang(null);
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        // "interrupted" is normal when we cancel for a new speech
        if (event.error !== "interrupted") {
          console.warn("SpeechSynthesis error:", event.error);
        }
        setSpeaking(false);
        setCurrentLang(null);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [findVoice]
  );

  /**
   * Toggle speech: if currently speaking the same lang, stop; otherwise start.
   */
  const toggle = useCallback(
    (text, lang = "en") => {
      if (speaking && currentLang === lang) {
        stop();
      } else {
        speak(text, lang);
      }
    },
    [speaking, currentLang, stop, speak]
  );

  // Auto-stop on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Preload voices (some browsers load them asynchronously)
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      };
    }
  }, []);

  return { speak, stop, toggle, speaking, currentLang };
};