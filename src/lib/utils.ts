import { clsx, type ClassValue } from "clsx";
import { DEFAULT_LOCALE, intlLocales, type Locale } from "@/lib/i18n";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatDate(value: Date | string | null | undefined, locale: Locale = DEFAULT_LOCALE, emptyLabel = "Не задано") {
  if (!value) return emptyLabel;
  return new Intl.DateTimeFormat(intlLocales[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined, locale: Locale = DEFAULT_LOCALE, emptyLabel = "Не задано") {
  if (!value) return emptyLabel;
  return new Intl.DateTimeFormat(intlLocales[locale], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function percent(value: number) {
  return `${Math.round(value)}%`;
}

export function toInt(value: string | string[] | undefined, fallback: number) {
  if (Array.isArray(value)) return fallback;
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
