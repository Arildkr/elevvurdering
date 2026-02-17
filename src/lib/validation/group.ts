import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(2, "Gruppenavn må være minst 2 tegn").max(100),
  joinCode: z
    .string()
    .min(4, "Gruppekode må være minst 4 tegn")
    .max(20)
    .regex(/^[A-Z0-9]+$/, "Gruppekode må være store bokstaver og tall")
    .transform((v) => v.toUpperCase()),
});

export const updateGroupSchema = createGroupSchema.partial();
