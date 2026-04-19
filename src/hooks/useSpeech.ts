import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "paisa.voice.enabled";

export function useSpeech() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "1";
  });
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  const pickVoice = useCallback(() => {
    const v = voicesRef.current;
    if (!v.length) return undefined;
    return (
      v.find((x) => /en[-_]IN/i.test(x.lang)) ||
      v.find((x) => /Google.*English/i.test(x.name)) ||
      v.find((x) => x.lang?.startsWith("en")) ||
      v[0]
    );
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!enabled) return;
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        // Strip emojis & markdown for cleaner TTS
        const clean = text
          .replace(/[*_`#>]/g, "")
          .replace(/[\p{Extended_Pictographic}]/gu, "")
          .trim();
        if (!clean) return;
        const u = new SpeechSynthesisUtterance(clean);
        const voice = pickVoice();
        if (voice) u.voice = voice;
        u.rate = 1.05;
        u.pitch = 1;
        u.onstart = () => setSpeaking(true);
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(u);
      } catch {
        /* ignore */
      }
    },
    [enabled, pickVoice]
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((e) => {
      const nv = !e;
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, nv ? "1" : "0");
      if (!nv && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return nv;
    });
  }, []);

  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  return { enabled, speaking, supported, speak, stop, toggle };
}
