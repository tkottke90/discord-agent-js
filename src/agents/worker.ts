import { OllamaClient } from './llm-clients/ollama.client.js';
import { DigitalOceanAIClient } from './llm-clients/digital-ocean.client.js';
import { parentPort, workerData, threadId } from 'node:worker_threads';
import { STATE, WorkerConfig, WorkerResponse } from './types/worker.js';
import { Logger } from '../utils/logging.js';

function main() {
  const logger = new Logger(`Worker-${threadId}`);
  
  logger.debug(`Worker started - Worker-${threadId} - ${workerData.engine}`);

  parentPort?.on('message', (message) => {
    logger.debug(`Worker-${threadId} received message: ${JSON.stringify(message)}`);
  });

  const setupResponse: WorkerResponse = {
    action: 'response:status',
    state: STATE.IDLE
  };

  parentPort?.postMessage(setupResponse);
}

main();