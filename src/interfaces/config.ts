import z from "zod";

export const DiscordConfigSchema = z.object({
  token: z.string().min(1),
  inviteUrl: z.string().optional(),
  llmClient: z.string().min(1),
});

export type DiscordConfig = z.infer<typeof DiscordConfigSchema>;

export const LLMClientConfigSchema = z.object({
  engine: z.string().min(1),
  baseUrl: z.string().min(1),
  timeout: z.number().positive().int().default(30000),
  headers: z.record(z.string(), z.string()).optional(),
  auth: z
    .object({
      // Adds an HTTP Basic Auth
      basic: z.string().min(1).optional(),

      // Adds an HTTP Bearer Token
      bearer: z.string().min(1).optional(),
    })
    .optional(),
});

export type LLMClientConfig = z.infer<typeof LLMClientConfigSchema>;

export interface LLMClientMap {
  [key: string]: LLMClientConfig;
}

export const RedisConfigSchema = z.object({
  location: z.string().min(1),
  username: z.string().optional(),
  password: z.string().optional(),
  ssl: z.boolean().default(false),
});

export type RedisConfig = z.infer<typeof RedisConfigSchema>;

export const ServerSchema = z.object({
  port: z.number().positive().int().default(3000),
  host: z.string().min(1).default('localhost'),
});

export type ServerConfig = z.infer<typeof ServerSchema>;

export const WorkerPoolConfigSchema = z.object({
  min: z.number().positive().int().default(1),
  max: z.number().positive().int().default(10),
});

export type WorkerPoolConfig = z.infer<typeof WorkerPoolConfigSchema>;

export type FullConfig = {
  cache: RedisConfig,
  discord: DiscordConfig,
  llmClients: LLMClientMap,
  server: ServerConfig,
  workers: WorkerPoolConfig
};