"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  REQUEST_PRIORITIES,
  SKILL_IMPORTANCE,
  importanceLabels,
  priorityLabels
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n/i18n-provider";
import { apiFetch } from "@/lib/api-client";
import { requestInputSchema, type RequestInput } from "@/server/validators/request";
import type { Skill } from "@/server/db/schema";

type InitialRequest = Omit<RequestInput, "deadline"> & {
  id: string;
  deadline?: string | null;
};

export function RequestForm({
  skills,
  initial
}: {
  skills: Skill[];
  initial?: InitialRequest;
}) {
  const router = useRouter();
  const { dictionary: t } = useI18n();
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<RequestInput["skills"]>(
    initial?.skills ?? []
  );
  const defaultValues = useMemo<RequestInput>(
    () => ({
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      category: initial?.category ?? "",
      priority: initial?.priority ?? "medium",
      deadline: initial?.deadline ?? "",
      skills: initial?.skills ?? []
    }),
    [initial]
  );

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RequestInput>({
    resolver: zodResolver(requestInputSchema),
    defaultValues
  });

  function toggleSkill(skillId: string, checked: boolean) {
    setSelectedSkills((current) => {
      const next = checked
        ? current.some((item) => item.skillId === skillId)
          ? current
          : [...current, { skillId, importance: "medium" as const }]
        : current.filter((item) => item.skillId !== skillId);
      setValue("skills", next, { shouldDirty: true, shouldValidate: true });
      return next;
    });
  }

  function setImportance(skillId: string, importance: RequestInput["skills"][number]["importance"]) {
    setSelectedSkills((current) => {
      const next = current.map((item) => (item.skillId === skillId ? { ...item, importance } : item));
      setValue("skills", next, { shouldDirty: true, shouldValidate: true });
      return next;
    });
  }

  async function onSubmit(values: RequestInput) {
    setFormError(null);
    const payload = {
      ...values,
      deadline: values.deadline || null,
      skills: selectedSkills
    };

    if (payload.skills.length === 0) {
      setFormError(t.requests.selectSkillError);
      return;
    }

    try {
      const response = await apiFetch(initial ? `/api/requests/${initial.id}` : "/api/requests", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!response.ok) {
        setFormError(data?.error ?? t.requests.saveError);
        return;
      }

      router.push(`/requests/${data?.id ?? initial?.id}`);
      router.refresh();
    } catch {
      setFormError(t.requests.saveError);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-4 rounded-lg border bg-surface p-5 shadow-card">
        <Field label={t.requests.titleField} error={errors.title ? t.errors.invalidField : undefined} required>
          <Input {...register("title")} placeholder={t.requests.titlePlaceholder} />
        </Field>
        <Field label={t.requests.descriptionField} error={errors.description ? t.errors.invalidField : undefined} required>
          <Textarea className="min-h-36" {...register("description")} placeholder={t.requests.descriptionPlaceholder} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.requests.categoryField} error={errors.category ? t.errors.invalidField : undefined} required>
            <Input {...register("category")} placeholder="Product, DevOps, Education" />
          </Field>
          <Field label={t.requests.deadlineField} error={errors.deadline ? t.errors.invalidField : undefined}>
            <Input type="datetime-local" {...register("deadline")} />
          </Field>
          <Field label={t.requests.priorityField} error={errors.priority ? t.errors.invalidField : undefined} required>
            <Select {...register("priority")}>
              {REQUEST_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {t.labels.priorities[priority] ?? priorityLabels[priority]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {formError ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {formError}
          </div>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t.common.saving : t.common.save}
          </Button>
        </div>
      </div>

      <aside className="self-start rounded-lg border bg-surface p-5 shadow-card lg:sticky lg:top-20">
        <h2 className="text-base font-semibold">{t.requests.requiredSkills}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.requests.requiredSkillsHelp}</p>
        {errors.skills ? <p className="mt-2 text-xs font-medium text-danger">{t.requests.selectSkillError}</p> : null}
        <div className="mt-4 grid gap-3">
          {skills.map((skill) => {
            const selected = selectedSkills.find((item) => item.skillId === skill.id);
            return (
              <div key={skill.id} className="rounded-md border bg-background/60 p-3 transition-colors hover:border-ring/35">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-input accent-primary"
                    checked={Boolean(selected)}
                    onChange={(event) => toggleSkill(skill.id, event.target.checked)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-foreground">{skill.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{skill.category}</span>
                  </span>
                </label>
                {selected ? (
                  <Select
                    className="mt-3 h-9"
                    value={selected.importance}
                    onChange={(event) => setImportance(skill.id, event.target.value as RequestInput["skills"][number]["importance"])}
                    aria-label={`${t.requests.skillImportanceAria} ${skill.name}`}
                  >
                    {SKILL_IMPORTANCE.map((importance) => (
                      <option key={importance} value={importance}>
                        {t.labels.importance[importance] ?? importanceLabels[importance]}
                      </option>
                    ))}
                  </Select>
                ) : null}
              </div>
            );
          })}
        </div>
      </aside>
    </form>
  );
}
