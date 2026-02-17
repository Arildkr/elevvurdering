import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Navn må være minst 2 tegn")
    .max(100, "Navn kan ikke være over 100 tegn"),
  joinCode: z
    .string()
    .min(1, "Gruppekode er påkrevd")
    .max(20)
    .transform((v) => v.toUpperCase()),
});

export const loginSchema = z.object({
  kandidatnummer: z
    .string()
    .min(1, "Kandidatnummer er påkrevd")
    .max(20)
    .transform((v) => v.toUpperCase()),
});
