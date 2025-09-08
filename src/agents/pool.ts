import crypto from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { STATE, WorkerResponse } from './types/worker.js';
import { Logger } from '../utils/logging.js';
import { CreateJob, WorkerConfig } from './types/pool.js';
import ConfigurationFile from 'config';
import { RedisConfig, LLMClientMap, WorkerPoolConfig } from '../interfaces/config.js';
import * as redis from '../redis.js';
import { getActiveWorkers, getAllWorkers, getWorkerStatus } from './worker/utilities.js';
import { Job } from './job.js';

export class WorkerPool {
  private workers: Map<string, Worker>;

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

    const worker = new Worker('./src/agents/worker/index.js', { workerData: JSON.stringify(workerConfig) });

    // Listen for responses
    worker.on('message', async (message: WorkerResponse) => {

      switch(message.action) {
        case 'response:complete': {
          this.logger.info(`Completed Job ${message.job}`);

          // Get Job keys
          const r = await redis.getClient()

          const keys = await r.keys(`job:${message.job}:*`)

          if (keys) {
            // Remove Job from Redis
            await redis.getClient()
              .del(keys)
  
            // TODO - Archive Job
            this.logger.debug(`Deleted Job ${message.job}`)
          }

          void this.assignAvailableWorkers();

          break;
        }
        case 'response:ready': {
          const jobs = await this.getJobs();

          if (jobs.length > 0) {
            void this.assignAvailableWorkers();
          } else {
            this.logger.debug('Worker Ready - No Jobs Available')
          }
        }
      }

      this.logger.debug(`Worker Response: ${JSON.stringify(message)}`);
    });

    this.workers.set(workerId, worker);
  }

  public async addJob(jobDetails: CreateJob) {
    const newJob = new Job(jobDetails);

    // We store the jobs in redis under the
    // job key and include
    //
    //  1. The Job ID so the worker can find it
    //  2. The priority so that the pool can organize them by priority
    //  3. The created at timestamp so the pool can organize them by time
    const jobKey = [
      'job',
      newJob.jobId,
      newJob.priority,
      newJob.createdAt,
    ].join(':');

    redis.getClient()
      .set(jobKey, JSON.stringify(newJob))
      .then(() => {
        this.logger.debug(`Job Added to Redis: ${jobKey}`);

        // Since a new job was added, we can work on assigning
        // that job to a worker
        void this.assignAvailableWorkers();
      })
      .catch(err => this.logger.error('Error adding job to Redis', err));
  }

  public async assignAvailableWorkers() {
    // Get Job Keys
    const jobList = await this.getJobs();

    // Get Jobs being worked
    const activeJobs = await getActiveWorkers(redis.getClient());

    console.dir(activeJobs);
    // const activeJobIds = activeJobs.map(job => job.split(':')[1]);
    
    for (const workerId of this.workers.keys()) {
      const status = await getWorkerStatus(workerId, redis.getClient());

      if (status === STATE.IDLE) {
        const job = jobList.filter(job => !activeJobs?.includes(job.jobId)).shift();
        if (job) {
          this.workers.get(workerId)?.postMessage({ id: job.jobId });
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

  public async getJobs() {
    return Job.sortListByKeys(await redis.getClient().keys('job:*')); 
  }

  public getWorkerCount() {
    return this.workers.size;
  }

  public hasWorker(workerId: string) {
    return this.workers.has(workerId);
  }

  public async initialize() {
    this.logger.debug('Initializing Worker Pool...');

    // Load Existing Workers from Redis by finding all keys that match worker:*:status
    const records = await getAllWorkers(redis.getClient());

    for (const record of records) {
      const workerId = record.split(':')[1];
      this.addWorker(workerId);
    }

    const poolConfig = ConfigurationFile.get<WorkerPoolConfig>('workers');

    for (let i = this.getWorkerCount(); i < poolConfig.min; i++) {
      this.addWorker();
    }

    this.logger.debug('Worker Pool Initialized');
  }

  public keys() {
    return this.workers.keys();
  }

  public async getWorkerStatus(workerId: string) {
    if (this.hasWorker(workerId)) {
      return getWorkerStatus(workerId, redis.getClient());
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
