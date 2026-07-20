import { z } from "zod";
import { REQUEST_PRIORITIES, REQUEST_STATUSES, SKILL_IMPORTANCE } from "@/lib/constants";

export const requestSkillInputSchema = z.object({
  skillId: z.string().uuid(),
  importance: z.enum(SKILL_IMPORTANCE)
});

export const requestInputSchema = z.object({
  title: z.string().trim().min(3).max(220),
  description: z.string().trim().min(10).max(6000),
  category: z.string().trim().min(2).max(120),
  priority: z.enum(REQUEST_PRIORITIES),
  deadline: z
    .string()
    .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), "Некорректная дата")
    .optional()
    .nullable(),
  skills: z
    .array(requestSkillInputSchema)
    .min(1, "Выберите хотя бы один навык")
    .max(100)
    .superRefine((items, context) => {
      const seen = new Set<string>();
      items.forEach((item, index) => {
        if (seen.has(item.skillId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Навык не должен повторяться",
            path: [index, "skillId"]
          });
        }
        seen.add(item.skillId);
      });
    })
});

export const requestListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  q: z.string().max(120).optional(),
  status: z.enum(REQUEST_STATUSES).optional(),
  priority: z.enum(REQUEST_PRIORITIES).optional(),
  category: z.string().max(120).optional(),
  sort: z.enum(["created_at", "deadline", "priority"]).default("created_at")
});

export type RequestInput = z.infer<typeof requestInputSchema>;
export type RequestListQuery = z.infer<typeof requestListQuerySchema>;
