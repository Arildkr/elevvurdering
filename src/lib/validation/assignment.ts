import { z } from "zod";

export const createAssignmentSchema = z
  .object({
    groupId: z.string().min(1, "Gruppe er påkrevd"),
    title: z.string().min(2, "Tittel må være minst 2 tegn").max(200),
    description: z.string().max(2000).optional(),
    writeDeadline: z.string().datetime({ message: "Ugyldig dato for skrivefrist" }).optional(),
    reviewDeadline: z.string().datetime({ message: "Ugyldig dato for vurderingsfrist" }).optional(),
    minReviews: z.number().int().min(1).max(10).default(1),
    feedbackDeadline: z.string().datetime({ message: "Ugyldig dato for tilbakemeldingsfrist" }).optional(),
  })
  .refine(
    (data) => {
      if (data.writeDeadline && data.reviewDeadline) {
        return new Date(data.reviewDeadline) > new Date(data.writeDeadline);
      }
      return true;
    },
    {
      message: "Vurderingsfrist må være etter skrivefrist",
      path: ["reviewDeadline"],
    }
  );

export const updateAssignmentSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  writeDeadline: z.string().datetime().optional(),
  reviewDeadline: z.string().datetime().optional(),
  minReviews: z.number().int().min(1).max(10).optional(),
  feedbackDeadline: z.string().datetime().nullable().optional(),
});
