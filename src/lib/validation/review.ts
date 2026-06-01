import { z } from "zod";

const rubricResponseItemSchema = z.object({
  id: z.string(),
  value: z.enum(["yes", "partial", "no"]),
});

export const createReviewSchema = z.object({
  reviewAssignmentId: z.string().min(1, "Review-tildeling er påkrevd"),
  content: z.string().min(10, "Tilbakemelding må være minst 10 tegn"),
  rubricResponse: z.array(rubricResponseItemSchema).optional(),
});
