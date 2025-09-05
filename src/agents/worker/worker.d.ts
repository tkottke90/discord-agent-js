import { RedisConfig, LLMClientMap } from "../../interfaces/config.ts";

export interface WorkerConfig {
  workerId: string;
  redis: RedisConfig;
  llmClients: LLMClientMap;
}