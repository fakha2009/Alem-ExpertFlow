import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  label,
  tone = "default"
}: {
  value: number;
  className?: string;
  label?: string;
  tone?: "default" | "warning" | "danger";
}) {
  const safeValue = Math.min(100, Math.max(0, value));
  const indicatorClass = {
    default: "fill-primary",
    warning: "fill-amber-500",
    danger: "fill-danger"
  }[tone];

  return (
    <div className={cn("grid gap-1.5", className)}>
      {label ? <div className="text-xs font-medium text-muted-foreground">{label}</div> : null}
      <svg
        className="h-2 w-full overflow-hidden rounded-full"
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
        aria-label={label}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
      >
        <rect width="100" height="8" rx="4" className="fill-muted" />
        <rect width={safeValue} height="8" rx="4" className={indicatorClass} />
      </svg>
    </div>
  );
}
