"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n/i18n-provider";
import { apiFetch } from "@/lib/api-client";
import { skillInputSchema, type SkillInput } from "@/server/validators/skill";

export function SkillForm() {
  const router = useRouter();
  const { dictionary: t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SkillInput>({
    resolver: zodResolver(skillInputSchema) as Resolver<SkillInput>,
    defaultValues: {
      name: "",
      slug: "",
      category: "",
      description: ""
    }
  });

  async function onSubmit(input: SkillInput) {
    setError(null);
    setSuccess(false);
    try {
      const response = await apiFetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? t.skills.createError);
        return;
      }

      reset();
      setSuccess(true);
      router.refresh();
    } catch {
      setError(t.skills.createError);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <Field label={t.skills.name} error={errors.name ? t.errors.invalidField : undefined} required>
        <Input {...register("name")} placeholder="Backend" />
      </Field>
      <Field label="Slug" error={errors.slug?.message} hint={t.skills.slugError} required>
        <Input {...register("slug")} placeholder="backend" />
      </Field>
      <Field label={t.skills.category} error={errors.category ? t.errors.invalidField : undefined} required>
        <Input {...register("category")} placeholder="Engineering" />
      </Field>
      <Field label={t.skills.descriptionField} error={errors.description ? t.errors.invalidField : undefined}>
        <Textarea {...register("description")} />
      </Field>
      {error ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {t.skills.createdSuccess}
        </div>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t.skills.creating : t.skills.createSkill}
      </Button>
    </form>
  );
}
