import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { detectLocale, translate, type Locale } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  t: (text: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("pt-BR");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const detected = detectLocale();
    setLocale(detected);
    document.documentElement.lang = detected;
  }, []);

  const t = useCallback((text: string) => translate(locale, text), [locale]);

  const value = useMemo(() => ({ locale, t }), [locale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale deve ser usado dentro de LocaleProvider");
  }
  return context;
}
