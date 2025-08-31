import crypto from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { STATE, WorkerResponse } from './types/worker'; 
import { Logger } from '../utils/logging';

type Job = {
  jobId: string,
  data: unknown,
  priority: number,
  createdAt: number
}

type CreateJob = Omit<Job, 'jobId' | 'createdAt' | 'priority'> & { priority?: number };

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
    const worker = new Worker('./src/agents/worker.ts', { workerData: {} });

    // Listen for status updates
    worker.on('message', (message: WorkerResponse) => {
      if (message.action === 'response:status') {
        this.logger.debug(`Worker Status Received ${workerId} - ${STATE[message.state]}`);
        this.workerStatus.set(workerId, message.state);
      }
    });

    this.workers.set(workerId, worker);
  }

  public async addJob(job: CreateJob) {
    this.jobQueue.push({
      ...job,
      jobId: crypto.randomUUID(),
      priority: job.priority ?? 0,
      createdAt: Date.now()
    });

    // Sort by Priority then by createdAt
    this.jobQueue.sort((a, b) => {
      if (a.priority === b.priority) {
        return a.createdAt - b.createdAt;
      }
      return a.priority - b.priority;
    });
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
}
