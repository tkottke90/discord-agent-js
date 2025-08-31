import { z } from 'zod';

export const LLMClientConfigSchema = z.object({
  engine: z.string().min(1),
  baseUrl: z.string().min(1),
  timeout: z.number().positive().int().default(30000),
  headers: z.record(z.string(), z.string()).optional(),
  auth: z.object({
    bearer: z.string().min(1)
  }).optional()
});
