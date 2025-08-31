import { z } from 'zod';

export const AppConfigSchema = z.object({
    port: z.number().positive().int().default(3000),
    host: z.string().min(1).default('localhost'),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
