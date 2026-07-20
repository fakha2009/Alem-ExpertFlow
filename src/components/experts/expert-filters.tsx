"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { EXPERT_TYPES, expertTypeLabels } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/i18n/i18n-provider";

export function ExpertFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { dictionary: t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const currentQuery = searchParams.get("q") ?? "";
    if (q === currentQuery) return;

    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const query = q.trim();
      params.delete("page");
      if (query) params.set("q", query);
      else params.delete("q");
      startTransition(() => router.replace(`/experts?${params.toString()}`));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [q, router, searchParams]);

  function apply(formData: FormData) {
    const params = new URLSearchParams();
    for (const key of ["q", "type", "available", "sort"]) {
      const value = String(formData.get(key) ?? "");
      if (value) params.set(key, value);
    }
    startTransition(() => router.push(`/experts?${params.toString()}`));
  }

  return (
    <form action={apply} className="grid gap-3 rounded-lg border bg-surface/95 p-4 shadow-card md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))_auto] md:items-center">
      <Input type="search" name="q" value={q} onChange={(event) => setQ(event.target.value)} placeholder={t.experts.searchPlaceholder} aria-label={t.experts.searchAria} />
      <Select name="type" defaultValue={searchParams.get("type") ?? ""} aria-label={t.experts.type}>
        <option value="">{t.experts.allTypes}</option>
        {EXPERT_TYPES.map((type) => (
          <option key={type} value={type}>
            {t.labels.expertTypes[type] ?? expertTypeLabels[type]}
          </option>
        ))}
      </Select>
      <Select name="available" defaultValue={searchParams.get("available") ?? ""} aria-label={t.experts.availability}>
        <option value="">{t.experts.anyAvailability}</option>
        <option value="true">{t.experts.available}</option>
        <option value="false">{t.experts.unavailable}</option>
      </Select>
      <Select name="sort" defaultValue={searchParams.get("sort") ?? "rating"} aria-label={t.common.sort}>
        <option value="rating">{t.experts.sortByRating}</option>
        <option value="load">{t.experts.sortByLoad}</option>
        <option value="completed">{t.experts.sortByCompleted}</option>
      </Select>
      <Button type="submit" variant="secondary" className="w-full md:w-auto" disabled={pending}>
        {pending ? t.common.loading : t.common.find}
      </Button>
    </form>
  );
}
