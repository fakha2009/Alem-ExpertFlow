import { z } from "zod";
import { EXPERT_TYPES } from "@/lib/constants";

const optionalUuidSchema = z
  .union([z.string().uuid(), z.literal("")])
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : value));

export const expertSkillInputSchema = z.object({
  skillId: z.string().uuid(),
  level: z.coerce.number().int().min(1).max(5),
  yearsExperience: z.coerce.number().int().min(0).max(50),
  verified: z.boolean().default(false)
});

export const expertInputSchema = z.object({
  fullName: z.string().trim().min(3).max(160),
  userId: optionalUuidSchema,
  type: z.enum(EXPERT_TYPES),
  bio: z.string().trim().max(3000).default(""),
  maxActiveRequests: z.coerce.number().int().min(1).max(100),
  rating: z.coerce.number().min(0).max(5),
  isAvailable: z.boolean(),
  responseTimeHours: z.coerce.number().int().min(1).max(720),
  skills: z
    .array(expertSkillInputSchema)
    .min(1, "Добавьте хотя бы один навык")
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

export const expertListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  q: z.string().max(120).optional(),
  type: z.enum(EXPERT_TYPES).optional(),
  available: z.enum(["true", "false"]).optional(),
  sort: z.enum(["rating", "load", "completed"]).default("rating")
});

export type ExpertInput = z.infer<typeof expertInputSchema>;
export type ExpertListQuery = z.infer<typeof expertListQuerySchema>;
