"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { localeNames, LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { Select } from "@/components/ui/select";

export function LanguageSwitcher({
  locale,
  label,
  className
}: {
  locale: Locale;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale || pending) return;

    startTransition(async () => {
      const response = await apiFetch("/api/preferences/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale })
      });
      if (response.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className={cn("w-36 shrink-0", className)} aria-busy={pending}>
      <Select
        aria-label={label}
        className="h-9"
        value={locale}
        disabled={pending}
        onChange={(event) => changeLocale(event.target.value as Locale)}
      >
        {LOCALES.map((item) => (
          <option key={item} value={item}>
            {localeNames[item]}
          </option>
        ))}
      </Select>
    </div>
  );
}
