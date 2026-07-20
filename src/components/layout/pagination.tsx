import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import type { AppDictionary } from "@/lib/i18n";
import { interpolate } from "@/lib/i18n";

export function Pagination({
  page,
  pageCount,
  searchParams,
  labels
}: {
  page: number;
  pageCount: number;
  searchParams: Record<string, string | string[] | undefined>;
  labels?: AppDictionary["pagination"];
}) {
  if (pageCount <= 1) return null;
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const currentLabels = labels ?? {
    pageOf: "Page {page} of {pageCount}",
    previous: "Previous",
    next: "Next"
  };

  function href(nextPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) continue;
      if (value && key !== "page") params.set(key, value);
    }
    params.set("page", String(nextPage));
    return `?${params.toString()}`;
  }

  const start = Math.max(1, Math.min(safePage - 2, pageCount - 4));
  const visiblePages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => start + index);

  return (
    <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span className="font-medium">
        {interpolate(currentLabels.pageOf, { page: safePage, pageCount })}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {safePage > 1 ? (
          <ButtonLink href={href(safePage - 1)} variant="secondary" size="sm">
            {currentLabels.previous}
          </ButtonLink>
        ) : null}
        {visiblePages.map((number) => (
          <Link
            key={number}
            href={href(number)}
            aria-current={number === safePage ? "page" : undefined}
            className={
              number === safePage
                ? "focus-ring inline-flex h-9 min-w-9 items-center justify-center rounded-md border bg-primary px-2 font-semibold text-primary-foreground"
                : "focus-ring inline-flex h-9 min-w-9 items-center justify-center rounded-md border bg-surface px-2 font-medium transition hover:bg-muted hover:text-foreground"
            }
          >
            {number}
          </Link>
        ))}
        {safePage < pageCount ? (
          <ButtonLink href={href(safePage + 1)} variant="secondary" size="sm">
            {currentLabels.next}
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
