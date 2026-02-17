import { z } from "zod";

export const createReviewSchema = z.object({
  reviewAssignmentId: z.string().min(1, "Review-tildeling er påkrevd"),
  content: z.string().min(10, "Tilbakemelding må være minst 10 tegn"),
});
