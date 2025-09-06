import { parentPort, workerData, isMainThread } from 'node:worker_threads';
import { Logger } from '../../utils/logging.js';
import { WorkerConfig } from './worker.js';
import { WorkerRequest } from '../types/worker.js';
import { OllamaClient, OllamaConfig } from '../llm-clients/ollama.client.js';
import { DigitalOceanAIClient, DOAIConfig } from '../llm-clients/digital-ocean.client.js';
import { LLMClientConfig } from '../types/client.js';
import { createRedisInstance } from '../../redis.js';

function setupMessageHandler(config: WorkerConfig, logger: Logger) {
  // Setup Redis
  const redisClient = createRedisInstance(config.redis, logger);
  
  logger.debug(`Redis Client Initialized`);

  // Initialize LLM Clients
  const llmClients = new Map<string, OllamaClient | DigitalOceanAIClient>();
  for (const [name, clientConfig] of Object.entries<LLMClientConfig>(config.llmClients)) {
    switch(clientConfig.engine) {
      case 'ollama':
        llmClients.set(name, new OllamaClient(clientConfig as OllamaConfig));
        break;
      case 'digitalocean':
        llmClients.set(name, new DigitalOceanAIClient(clientConfig as DOAIConfig));
        break;
      default:
        logger.error(`Unknown LLM engine: ${clientConfig.engine}`);
        break;
    }
  }
  
  logger.debug(`LLM Clients Initialized: ${[...llmClients.keys()]}`);

  return (message: WorkerRequest) => {
    logger.debug(`Received message: ${JSON.stringify(message).substring(0, 20)}...`);
  }
}

function main() {
  const workerConfig = JSON.parse(workerData) as WorkerConfig;
  const workerName = `Worker-${workerConfig.workerId}`;

  const logger = new Logger(workerName);

  parentPort?.on('message', setupMessageHandler(workerConfig, logger));

  logger.debug(`Worker started - ${workerName}`);

  parentPort?.postMessage({ action: 'response:ready' });
}

if (!isMainThread) {
  main();
} else {
  console.log('External Thread');
}
