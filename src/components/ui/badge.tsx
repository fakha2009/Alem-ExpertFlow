import { priorityLabels, statusLabels, type RequestPriority, type RequestStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

const statusClasses: Record<RequestStatus, string> = {
  new: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800",
  assigned: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-200 dark:border-cyan-800",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800",
  review: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:border-violet-800",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
  rejected: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800"
};

const priorityClasses: Record<RequestPriority, string> = {
  low: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700",
  medium: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-800",
  high: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
  urgent: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800"
};

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium leading-none shadow-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: RequestStatus; label?: string }) {
  return <Badge className={statusClasses[status]}>{label ?? statusLabels[status]}</Badge>;
}

export function PriorityBadge({ priority, label }: { priority: RequestPriority; label?: string }) {
  return <Badge className={priorityClasses[priority]}>{label ?? priorityLabels[priority]}</Badge>;
}
