import { z } from "zod";

export const submitTextSchema = z.object({
  content: z.string().min(50, "Teksten må være minst 50 tegn"),
});
