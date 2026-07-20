import "server-only";

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, getDictionary, isLocale, LOCALE_COOKIE } from "@/lib/i18n";

export async function getCurrentLocale() {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
}

export async function getCurrentI18n() {
  const locale = await getCurrentLocale();
  return {
    locale,
    dictionary: getDictionary(locale)
  };
}
