"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AppDictionary, Locale } from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  dictionary: AppDictionary;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  dictionary,
  children
}: I18nContextValue & {
  children: ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, dictionary }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used within I18nProvider.");
  }
  return value;
}
