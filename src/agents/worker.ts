import { OllamaClient } from './llm-clients/ollama.client';
import { DigitalOceanAIClient } from './llm-clients/digital-ocean.client';
import { parentPort, workerData, threadId } from 'node:worker_threads';
import { STATE, WorkerConfig } from './types/worker';
import { Logger } from '../utils/logging';

function main() {
  const logger = new Logger(`Worker-${threadId}`);
  
  logger.debug(`Worker started - Worker-${threadId} - ${workerData.engine}`);

  parentPort?.on('message', (message) => {
    logger.debug(`Worker-${threadId} received message: ${JSON.stringify(message)}`);
  });

  parentPort?.postMessage({ threadId, state: STATE.IDLE });
}

main();