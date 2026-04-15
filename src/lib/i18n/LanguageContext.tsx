"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Locale, translations } from "./translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "tr",
  setLocale: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage?.getItem("recuter-lang") as Locale;
      if (saved === "tr" || saved === "de") return saved;
    }
    return "tr";
  });

  const handleSetLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    if (typeof window !== "undefined") {
      window.localStorage?.setItem("recuter-lang", newLocale);
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      return translations[locale]?.[key] || translations["tr"]?.[key] || key;
    },
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
