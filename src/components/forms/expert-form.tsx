"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { EXPERT_TYPES, expertTypeLabels } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n/i18n-provider";
import { apiFetch } from "@/lib/api-client";
import { expertInputSchema, type ExpertInput } from "@/server/validators/expert";
import type { Skill } from "@/server/db/schema";

type InitialExpert = Omit<ExpertInput, "skills"> & {
  id: string;
  currentLoad: number;
  completedRequestsCount: number;
  skills: ExpertInput["skills"];
};

type ExpertUserOption = {
  id: string;
  email: string;
  fullName: string;
};

export function ExpertForm({
  skills,
  userOptions,
  initial
}: {
  skills: Skill[];
  userOptions: ExpertUserOption[];
  initial?: InitialExpert;
}) {
  const router = useRouter();
  const { dictionary: t } = useI18n();
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<ExpertInput["skills"]>(
    initial?.skills ?? []
  );
  const defaultValues = useMemo<ExpertInput>(
    () => ({
      fullName: initial?.fullName ?? "",
      userId: initial?.userId ?? "",
      type: initial?.type ?? "expert",
      bio: initial?.bio ?? "",
      maxActiveRequests: initial?.maxActiveRequests ?? 5,
      rating: initial?.rating ?? 4.5,
      isAvailable: initial?.isAvailable ?? true,
      responseTimeHours: initial?.responseTimeHours ?? 24,
      skills: initial?.skills ?? []
    }),
    [initial]
  );
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ExpertInput>({
    resolver: zodResolver(expertInputSchema) as Resolver<ExpertInput>,
    defaultValues
  });

  function toggleSkill(skillId: string, checked: boolean) {
    setSelectedSkills((current) => {
      const next = checked
        ? current.some((item) => item.skillId === skillId)
          ? current
          : [...current, { skillId, level: 3, yearsExperience: 1, verified: false }]
        : current.filter((item) => item.skillId !== skillId);
      setValue("skills", next, { shouldDirty: true, shouldValidate: true });
      return next;
    });
  }

  function patchSkill(skillId: string, patch: Partial<ExpertInput["skills"][number]>) {
    setSelectedSkills((current) => {
      const next = current.map((item) => (item.skillId === skillId ? { ...item, ...patch } : item));
      setValue("skills", next, { shouldDirty: true, shouldValidate: true });
      return next;
    });
  }

  async function onSubmit(values: ExpertInput) {
    setFormError(null);
    const payload = {
      ...values,
      userId: values.userId || null,
      skills: selectedSkills
    };

    if (payload.skills.length === 0) {
      setFormError(t.experts.addSkillError);
      return;
    }

    try {
      const response = await apiFetch(initial ? `/api/experts/${initial.id}` : "/api/experts", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!response.ok) {
        setFormError(data?.error ?? t.experts.saveError);
        return;
      }

      router.push(`/experts/${data?.id ?? initial?.id}`);
      router.refresh();
    } catch {
      setFormError(t.experts.saveError);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-4 rounded-lg border bg-surface p-5 shadow-card">
        <Field label={t.experts.fullName} error={errors.fullName ? t.errors.invalidField : undefined} required>
          <Input {...register("fullName")} />
        </Field>
        <Field label={t.experts.bio} error={errors.bio ? t.errors.invalidField : undefined}>
          <Textarea className="min-h-32" {...register("bio")} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.experts.type} error={errors.type ? t.errors.invalidField : undefined} required>
            <Select {...register("type")}>
              {EXPERT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t.labels.expertTypes[type] ?? expertTypeLabels[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.experts.userIdOptional} error={errors.userId ? t.errors.invalidField : undefined}>
            <Select {...register("userId")}>
              <option value="">{t.requests.unassigned}</option>
              {userOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.fullName} · {option.email}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.experts.maxActiveRequests} error={errors.maxActiveRequests ? t.errors.invalidField : undefined}>
            <Input type="number" min={1} {...register("maxActiveRequests", { valueAsNumber: true })} />
          </Field>
          <Field label={t.experts.rating} error={errors.rating ? t.errors.invalidField : undefined}>
            <Input type="number" min={0} max={5} step={0.1} {...register("rating", { valueAsNumber: true })} />
          </Field>
          <Field label={t.experts.responseTimeHours} error={errors.responseTimeHours ? t.errors.invalidField : undefined}>
            <Input type="number" min={1} {...register("responseTimeHours", { valueAsNumber: true })} />
          </Field>
          {initial ? (
            <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/40 p-3 text-sm md:col-span-2">
              <div>
                <div className="text-xs text-muted-foreground">{t.experts.currentLoad}</div>
                <div className="mt-1 font-semibold">{initial.currentLoad}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t.experts.completedRequests}</div>
                <div className="mt-1 font-semibold">{initial.completedRequestsCount}</div>
              </div>
            </div>
          ) : null}
          <label className="flex items-center gap-3 rounded-md border bg-background/70 px-3 py-2 text-sm font-medium transition-colors hover:border-ring/35">
            <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" {...register("isAvailable")} />
            {t.experts.availableForAssignments}
          </label>
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
        <h2 className="text-base font-semibold">{t.experts.expertSkills}</h2>
        {errors.skills ? <p className="mt-2 text-xs font-medium text-danger">{t.experts.addSkillError}</p> : null}
        <div className="mt-4 grid gap-3">
          {skills.map((skill) => {
            const selected = selectedSkills.find((item) => item.skillId === skill.id);
            return (
              <div key={skill.id} className="rounded-md border bg-background/60 p-3 transition-colors hover:border-ring/35">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={Boolean(selected)}
                    onChange={(event) => toggleSkill(skill.id, event.target.checked)}
                  />
                  <span className="font-medium">{skill.name}</span>
                </label>
                {selected ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      <span>{t.experts.levelAria}</span>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={selected.level}
                        onChange={(event) => patchSkill(skill.id, { level: Number(event.target.value) })}
                        aria-label={`${t.experts.levelAria} ${skill.name}`}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      <span>{t.experts.experienceAria}</span>
                      <Input
                        type="number"
                        min={0}
                        value={selected.yearsExperience}
                        onChange={(event) => patchSkill(skill.id, { yearsExperience: Number(event.target.value) })}
                        aria-label={`${t.experts.experienceAria} ${skill.name}`}
                      />
                    </label>
                    <label className="col-span-2 flex h-10 items-center gap-2 rounded-md border bg-surface px-3 text-xs font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input accent-primary"
                        checked={selected.verified}
                        onChange={(event) => patchSkill(skill.id, { verified: event.target.checked })}
                      />
                      {t.experts.verified}
                    </label>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </aside>
    </form>
  );
}
