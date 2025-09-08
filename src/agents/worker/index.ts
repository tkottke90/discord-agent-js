import { parentPort, workerData, isMainThread } from 'node:worker_threads';
import { Logger } from '../../utils/logging.js';
import { Job, WorkerConfig } from '../types/pool.js';
import { STATE } from '../types/worker.js';
import { OllamaClient, OllamaConfig } from '../llm-clients/ollama.client.js';
import { DigitalOceanAIClient, DOAIConfig } from '../llm-clients/digital-ocean.client.js';
import { LLMClientConfig } from '../types/client.js';
import { createRedisInstance, RedisClient } from '../../redis.js';
import { getWorkerJob, getWorkerStatus, setWorkerJob, setWorkerStatus } from './utilities.js';

/**
 * Class containing all the logic for a worker. This way we can
 * contain common properties across the lifetime of a worker.
 */
class Worker {
  readonly id: string;
  status: STATE = STATE.INITIALIZING;

  llmClients: Map<string, OllamaClient | DigitalOceanAIClient> = new Map();
  redisClient!: RedisClient;

  constructor(
    private readonly config: WorkerConfig,
    private readonly logger: Logger,
  ) {
    this.id = config.workerId;
  }

  async initialize() {
    await this.setupLLMClients();
    await this.setupRedis();
  }

  /**
   * Handle messages from the Job Queue.  The job is loaded from the 
   * Redis database
   * @param {Object} message
   * @param {string} message.id - The job id
   */
  async onMessage(message: { id: string }) {
    this.logger.debug(`Received Job: ${message.id}`);
    
    await this.setStatus(STATE.BUSY);
    await setWorkerJob(this.id, message.id, this.redisClient);

    await this.processJob(message.id);
  }

  async processJob(jobId: string) {
    this.logger.debug(`Started Processing Job ${jobId}`);
    const job = await this.loadJob(jobId);

    // TODO: Job Processing

    this.logger.debug(`Finished Processing Job ${job.jobId}`);
    await this.setStatus(STATE.IDLE);
    await setWorkerJob(this.id, '', this.redisClient);
  } 


  private async setStatus(state: STATE) {
    this.status = state;
    await setWorkerStatus(this.id, state, this.redisClient);
  }

  /**
   * Load the LLM Clients from the config file so that they can be used
   * to process jobs.
   */
  private async setupLLMClients() {
    const llmClients = new Map<string, OllamaClient | DigitalOceanAIClient>();
    for (const [name, clientConfig] of Object.entries<LLMClientConfig>(this.config.llmClients)) {
      switch(clientConfig.engine) {
        case 'ollama':
          llmClients.set(name, new OllamaClient(clientConfig as OllamaConfig));
          break;
        case 'digitalocean':
          llmClients.set(name, new DigitalOceanAIClient(clientConfig as DOAIConfig));
          break;
        default:
          this.logger.error(`Unknown LLM engine: ${clientConfig.engine}`);
          break;
      }
    }
    
    this.logger.debug(`LLM Clients Initialized: ${[...llmClients.keys()]}`);
  }

  /**
   * Redis is used to manage the worker and jobs that the worker is working
   * on.  This function sets up the redis client AND handles loading any
   * in-progress work the worker was working on.
   */
  private async setupRedis() {
    this.redisClient = createRedisInstance(this.config.redis, this.logger);

    this.redisClient.on('error', err => this.logger.error('Redis Error', err));

    await this.redisClient.connect();

    // Pull worker status from redis
    this.status = await getWorkerStatus(this.id, this.redisClient);

    if (this.status === STATE.BUSY) {
      // Get the job id
      const jobId = await getWorkerJob(this.id, this.redisClient);

      if (jobId) {
        this.logger.debug(`Resuming Job ${jobId}`);
        await this.processJob(jobId);
      } else {
        this.logger.error(`Worker started in BUSY state but no job id found`);
        await this.setStatus(STATE.IDLE);
      }

    }
    
    this.logger.debug(`Redis Client Initialized`);
  }

  /**
   * Helper job to load a job from Redis.
   * @param jobId - The job id to load
   * @returns The job data
   * @throws Error if the job is not found
   */
  private async loadJob(jobId: string) {
    const [ jobKey ] = await this.redisClient.keys(`job:${jobId}*`);

    if (!jobKey) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const job = await this.redisClient.get(jobKey) as string;

    
    return JSON.parse(job) as Job;
  }
}

async function main() {
  const workerConfig = JSON.parse(workerData) as WorkerConfig;
  const workerName = `Worker-${workerConfig.workerId}`;

  const logger = new Logger(workerName);

  const worker = new Worker(workerConfig, logger);
  await worker.initialize();

  parentPort?.on('message', worker.onMessage.bind(worker));

  logger.debug(`Worker started - ${workerName}`);

  parentPort?.postMessage({ action: 'response:ready' });
}

if (!isMainThread) {
  main();
} else {
  console.log('External Thread');
}

process.on('uncaughtException', () => {
  parentPort?.postMessage('I am broken')
})