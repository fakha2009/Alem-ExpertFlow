import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "focus-ring min-h-28 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm leading-6 text-foreground shadow-sm transition placeholder:text-muted-foreground/80 hover:border-ring/40 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-60 aria-[invalid=true]:border-danger",
        className
      )}
      {...props}
    />
  );
}
