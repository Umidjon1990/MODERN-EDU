import { z } from 'zod';

/** O'quvchi AI-repetitorga savol beradi. */
export const tutorRequestSchema = z.object({
  question: z.string().min(1).max(2000),
});
export type TutorRequest = z.infer<typeof tutorRequestSchema>;

export const tutorResponseSchema = z.object({
  answer: z.string(),
  model: z.string(),
});
export type TutorResponse = z.infer<typeof tutorResponseSchema>;
