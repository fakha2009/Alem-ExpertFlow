"use client";

import { DEFAULT_LOCALE, getDictionary, isLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

function getClientDictionary() {
  if (typeof document === "undefined") return getDictionary(DEFAULT_LOCALE);
  const locale = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];

  return getDictionary(isLocale(locale) ? locale : DEFAULT_LOCALE);
}

export default function ErrorPage({ reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dictionary = getClientDictionary();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="max-w-md rounded-lg border bg-surface p-6 text-center shadow-soft">
        <h1 className="text-lg font-semibold">{dictionary.errors.pageTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{dictionary.errors.pageText}</p>
        <Button type="button" className="mt-5" onClick={reset}>
          {dictionary.common.retry}
        </Button>
      </div>
    </main>
  );
}
