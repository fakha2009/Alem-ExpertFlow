"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n/i18n-provider";
import { getSafeRedirectPath } from "@/lib/navigation";
import { apiFetch } from "@/lib/api-client";
import { loginSchema, type LoginInput } from "@/server/validators/auth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dictionary: t } = useI18n();
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  async function onSubmit(input: LoginInput) {
    setFormError(null);
    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        setFormError(response.status === 429 ? t.auth.tooManyAttempts : response.status === 401 ? t.auth.invalidCredentials : t.auth.unableLogin);
        return;
      }

      router.push(getSafeRedirectPath(searchParams.get("next")));
      router.refresh();
    } catch {
      setFormError(t.auth.unableLogin);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <Field label={t.auth.email} error={errors.email ? t.errors.invalidField : undefined} required>
        <Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} {...register("email")} />
      </Field>
      <Field label={t.auth.password} error={errors.password ? t.errors.invalidField : undefined} required>
        {(fieldProps) => (
          <div className="relative">
            <Input
              {...fieldProps}
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              className="pr-11"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? t.auth.hidePassword : t.auth.showPassword}
              className="focus-ring absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {passwordVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        )}
      </Field>
      {formError ? (
        <div role="alert" aria-live="polite" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {formError}
        </div>
      ) : null}
      <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="w-full">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {isSubmitting ? t.auth.checking : t.auth.signIn}
      </Button>
    </form>
  );
}
