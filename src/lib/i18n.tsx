"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

/* Frontend i18n files approach: static dictionaries (en/hi) with room
   for more languages (pa, bn, mr, ta, te, gu, kn, ml, or). */

const en: Record<string, string> = {
  "nav.overview": "Overview",
  "nav.fields": "Fields",
  "nav.recommend": "Crop Intelligence",
  "nav.disease": "Disease Scan",
  "nav.weather": "Weather",
  "nav.market": "Market",
  "nav.yield": "Yield",
  "nav.profit": "Profit Planner",
  "nav.rotation": "Rotation",
  "nav.fertilizer": "Fertilizer",
  "nav.alerts": "Alerts",
  "nav.community": "Community",
  "nav.schemes": "Schemes",
  "nav.history": "History",
  "nav.models": "Model Lab",
  "nav.profile": "Profile",
  "app.greeting.morning": "Good morning",
  "app.greeting.afternoon": "Good afternoon",
  "app.greeting.evening": "Good evening",
  "app.heading": "Your Farm Intelligence",
  "app.sub": "Soil, weather, markets and models — one command center.",
  "common.analyze": "Analyze Field",
  "common.save": "Save advisory",
  "common.saved": "Saved",
  "common.loading": "Loading…",
  "common.recommended": "Recommended crop",
  "common.suitability": "Suitability score",
  "common.why": "Why this recommendation?",
  "common.alternatives": "Alternatives",
  "common.whatif": "What if inputs change?",
  "common.logout": "Sign out",
  "common.language": "भाषा",
};

const hi: Record<string, string> = {
  "nav.overview": "अवलोकन",
  "nav.fields": "खेत",
  "nav.recommend": "फसल विश्लेषण",
  "nav.disease": "रोग जाँच",
  "nav.weather": "मौसम",
  "nav.market": "मंडी भाव",
  "nav.yield": "उपज",
  "nav.profit": "लाभ योजना",
  "nav.rotation": "फसल चक्र",
  "nav.fertilizer": "उर्वरक",
  "nav.alerts": "सूचनाएँ",
  "nav.community": "समुदाय",
  "nav.schemes": "योजनाएँ",
  "nav.history": "इतिहास",
  "nav.models": "मॉडल लैब",
  "nav.profile": "प्रोफ़ाइल",
  "app.greeting.morning": "सुप्रभात",
  "app.greeting.afternoon": "नमस्ते",
  "app.greeting.evening": "शुभ संध्या",
  "app.heading": "आपकी फार्म इंटेलिजेंस",
  "app.sub": "मिट्टी, मौसम, बाज़ार और मॉडल — एक ही जगह।",
  "common.analyze": "खेत विश्लेषण करें",
  "common.save": "सलाह सहेजें",
  "common.saved": "सहेजा गया",
  "common.loading": "लोड हो रहा है…",
  "common.recommended": "अनुशंसित फसल",
  "common.suitability": "उपयुक्तता स्कोर",
  "common.why": "यह सिफ़ारिश क्यों?",
  "common.alternatives": "विकल्प",
  "common.whatif": "इनपुट बदलने पर क्या होगा?",
  "common.logout": "साइन आउट",
  "common.language": "Language",
};

const dicts: Record<string, Record<string, string>> = { en, hi };

export type Lang = "en" | "hi";

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nCtx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function LangProvider({
  children,
  initial = "en",
}: {
  children: React.ReactNode;
  initial?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initial);
  useEffect(() => {
    const stored = localStorage.getItem("ks_lang");
    if (stored === "hi" || stored === "en") setLangState(stored);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("ks_lang", l);
    } catch {
      /* ignore */
    }
  };
  const t = (key: string) => dicts[lang][key] ?? dicts.en[key] ?? key;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
