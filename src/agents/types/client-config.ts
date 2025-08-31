import {z} from 'zod';

export const LLMClientConfigSchema = z.object({
  baseUrl: z.string().min(1),
  timeout: z.number().positive().int().default(30000),
  headers: z.record(z.string(), z.string()).optional(),
});
