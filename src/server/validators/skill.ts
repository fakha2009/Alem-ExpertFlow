import { z } from "zod";

export const skillInputSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug должен быть в kebab-case"),
  category: z.string().min(2).max(120),
  description: z.string().max(2000).default("")
});

export type SkillInput = z.infer<typeof skillInputSchema>;
