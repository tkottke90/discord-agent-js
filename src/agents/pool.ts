import crypto from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { STATE, WorkerRequest, WorkerResponse } from './types/worker.js';
import { Logger } from '../utils/logging.js';
import { WorkerConfig } from './worker/worker.js';
import ConfigurationFile from 'config';
import { RedisConfig, LLMClientMap } from '../interfaces/config.js';

type Job = {
  jobId: string;
  data: WorkerRequest;
  engine: string;
  priority: number;
  createdAt: number;
};

type CreateJob = Omit<Job, 'jobId' | 'createdAt' | 'priority'> & {
  priority?: number;
};

export class WorkerPool {
  private workers: Map<string, Worker>;
  private workerStatus = new Map<string, STATE>();

  private jobQueue: Job[] = [];

  private logger = new Logger('WorkerPool');

  constructor() {
    this.workers = new Map();
  }

  public addWorker(workerId: string = crypto.randomUUID()) {
    this.logger.debug(`Adding Worker ${workerId}`);

    const workerConfig: WorkerConfig = {
      workerId,
      redis: ConfigurationFile.get<RedisConfig>('cache'),
      llmClients: ConfigurationFile.get<LLMClientMap>('llmClients'),
    };

    const worker = new Worker('./dist/agents/worker/index.js', { workerData: JSON.stringify(workerConfig) });

    // Listen for responses
    worker.on('message', (message: WorkerResponse<WorkerRequest>) => {
      switch (message.action) {
        case 'response:status':
          this.logger.debug(
            `Worker Status Received ${workerId} - ${STATE[message.state]}`,
          );
          this.workerStatus.set(workerId, message.state);
          break;
        case 'response:ready':
          this.logger.debug(`Worker Ready ${workerId}`);

          if (this.jobQueue.length > 0) {
            worker.postMessage(this.jobQueue.shift()!.data);
          } else {
            this.workerStatus.set(workerId, STATE.IDLE);
          }

          break;
      }
    });

    this.workers.set(workerId, worker);
  }

  public addJob(job: CreateJob) {
    this.jobQueue.push({
      ...job,
      jobId: crypto.randomUUID(),
      priority: job.priority ?? 0,
      createdAt: Date.now(),
    });

    // Sort by Priority then by createdAt
    this.jobQueue.sort((a, b) => {
      if (a.priority === b.priority) {
        return a.createdAt - b.createdAt;
      }
      return a.priority - b.priority;
    });

    // Since a new job was added, we can work on assigning
    // that job to a worker
    void this.assignAvailableWorkers();
  }

  public async assignAvailableWorkers() {
    for (const workerId of this.workers.keys()) {
      if (this.workerStatus.get(workerId) === STATE.IDLE) {
        const job = this.jobQueue.shift();
        if (job) {
          this.workers.get(workerId)?.postMessage(job.data);
        }
      }
    }
  }

  public getWorker(workerId: string) {
    return this.workers.get(workerId);
  }

  public removeWorker(workerId: string) {
    this.workers.delete(workerId);
  }

  public getWorkerCount() {
    return this.workers.size;
  }

  public hasWorker(workerId: string) {
    return this.workers.has(workerId);
  }

  public keys() {
    return this.workers.keys();
  }

  public async getWorkerStatus(workerId: string) {
    if (this.hasWorker(workerId)) {
      return this.workerStatus.get(workerId);
    }
  }

  public async shutdown() {
    this.logger.debug('Shutting down Worker Pool...');

    for (const workerId of this.workers.keys()) {
      this.logger.debug(`Terminating Worker ${workerId}`);
      this.workers.get(workerId)?.terminate();
    }
  }
}
