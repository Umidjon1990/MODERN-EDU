import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL kerak'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET kamida 16 belgi'),
  CORS_ORIGIN: z.string().default('*'),
  REDIS_URL: z.string().optional(),
});

export type RealtimeEnv = z.infer<typeof schema>;

export function loadEnv(): RealtimeEnv {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Muhit o'zgaruvchilari noto'g'ri:\n${issues}`);
  }
  return parsed.data;
}
