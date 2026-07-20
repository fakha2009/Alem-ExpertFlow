import { z } from "zod";

export const commentInputSchema = z.object({
  body: z.string().min(1).max(2000)
});

export type CommentInput = z.infer<typeof commentInputSchema>;
