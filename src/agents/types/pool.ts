import { RedisConfig, LLMClientMap } from "../../interfaces/config.js";
import { WorkerRequest } from "./worker.js";

export interface WorkerConfig {
  workerId: string;
  redis: RedisConfig;
  llmClients: LLMClientMap;
}

export type Job = {
  jobId: string;
  data: WorkerRequest;
  engine: string;
  priority: number;
  createdAt: number;
};

export type CreateJob = Omit<Job, 'jobId' | 'createdAt' | 'priority'> & {
  priority?: number;
};