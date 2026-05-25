import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(2, "Gruppenavn må være minst 2 tegn").max(100),
});

export const updateGroupSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  regenerateCode: z.boolean().optional(),
});
