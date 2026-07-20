import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/80 hover:border-ring/40 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-60 aria-[invalid=true]:border-danger",
        className
      )}
      {...props}
    />
  );
}
