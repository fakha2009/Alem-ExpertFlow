import { cn } from "@/lib/utils";

export function SimpleBarChart({
  data,
  valueKey = "value",
  labelKey = "label",
  className
}: {
  data: Array<Record<string, string | number>>;
  valueKey?: string;
  labelKey?: string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((item) => Number(item[valueKey] ?? 0)));

  return (
    <div className={cn("grid gap-3", className)}>
      {data.map((item) => {
        const value = Number(item[valueKey] ?? 0);
        return (
          <div key={String(item[labelKey])} className="grid grid-cols-[110px_1fr_42px] items-center gap-3 text-sm">
            <div className="truncate text-muted-foreground">{String(item[labelKey])}</div>
            <svg className="h-2.5 w-full overflow-hidden rounded-full" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
              <rect width="100" height="10" rx="5" className="fill-muted" />
              <rect width={(value / max) * 100} height="10" rx="5" className="fill-primary" />
            </svg>
            <div className="text-right font-medium">{value}</div>
          </div>
        );
      })}
    </div>
  );
}

export function TrendChart({
  data,
  labels = { total: "Total", done: "Done" }
}: {
  data: Array<{
    date: string;
    total: number;
    done: number;
  }>;
  labels?: {
    total: string;
    done: string;
  };
}) {
  const max = Math.max(1, ...data.map((item) => item.total));

  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid h-48 grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-1 rounded-md border bg-background/55 px-2 pb-3 sm:h-56 sm:gap-2 sm:px-3">
        {data.map((item, index) => (
          <div key={item.date} className="flex flex-1 flex-col items-center gap-2">
            <svg className="h-32 w-full overflow-visible sm:h-40 sm:max-w-8" viewBox="0 0 20 100" preserveAspectRatio="none" role="img" aria-label={`${labels.total}: ${item.total}; ${labels.done}: ${item.done}`}>
              <rect x="2" y={100 - Math.max(4, (item.total / max) * 100)} width="7" height={Math.max(4, (item.total / max) * 100)} rx="1.5" className="fill-primary" />
              <rect x="11" y={100 - Math.max(3, (item.done / max) * 100)} width="7" height={Math.max(3, (item.done / max) * 100)} rx="1.5" className="fill-emerald-500" />
            </svg>
            <span className={cn("text-[10px] text-muted-foreground sm:text-[11px]", index % 2 === 1 ? "hidden sm:inline" : null)}>
              {item.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
