"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { REQUEST_PRIORITIES, REQUEST_STATUSES, priorityLabels, statusLabels } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/i18n/i18n-provider";

export function RequestFilters({ categories }: { categories: string[] }) {
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
      startTransition(() => router.replace(`/requests?${params.toString()}`));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [q, router, searchParams]);

  function apply(formData: FormData) {
    const params = new URLSearchParams();
    for (const key of ["q", "status", "priority", "category", "sort"]) {
      const value = String(formData.get(key) ?? "");
      if (value) params.set(key, value);
    }
    startTransition(() => router.push(`/requests?${params.toString()}`));
  }

  return (
    <form action={apply} className="grid gap-3 rounded-lg border bg-surface/95 p-4 shadow-card md:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))_auto] md:items-center">
      <Input type="search" name="q" value={q} onChange={(event) => setQ(event.target.value)} placeholder={t.requests.searchPlaceholder} aria-label={t.requests.searchAria} />
      <Select name="status" defaultValue={searchParams.get("status") ?? ""} aria-label={t.requests.tableStatus}>
        <option value="">{t.requests.allStatuses}</option>
        {REQUEST_STATUSES.map((status) => (
          <option key={status} value={status}>
            {t.labels.statuses[status] ?? statusLabels[status]}
          </option>
        ))}
      </Select>
      <Select name="priority" defaultValue={searchParams.get("priority") ?? ""} aria-label={t.requests.tablePriority}>
        <option value="">{t.requests.allPriorities}</option>
        {REQUEST_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {t.labels.priorities[priority] ?? priorityLabels[priority]}
          </option>
        ))}
      </Select>
      <Select name="category" defaultValue={searchParams.get("category") ?? ""} aria-label={t.requests.categoryField}>
        <option value="">{t.requests.allCategories}</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </Select>
      <Select name="sort" defaultValue={searchParams.get("sort") ?? "created_at"} aria-label={t.common.sort}>
        <option value="created_at">{t.requests.sortByDate}</option>
        <option value="deadline">{t.requests.sortByDeadline}</option>
        <option value="priority">{t.requests.sortByPriority}</option>
      </Select>
      <Button type="submit" variant="secondary" className="w-full md:w-auto" disabled={pending}>
        {pending ? t.common.loading : t.common.find}
      </Button>
    </form>
  );
}
