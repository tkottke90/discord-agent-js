import { OllamaClient } from './llm-clients/ollama.client.js';
import { DigitalOceanAIClient } from './llm-clients/digital-ocean.client.js';
import { parentPort, workerData, threadId } from 'node:worker_threads';
import { STATE, WorkerConfig, WorkerRequest, WorkerResponse } from './types/worker.js';
import { Logger } from '../utils/logging.js';

async function messageReducer(message: WorkerRequest): Promise<WorkerResponse> {
  switch(message.action) {
    case 'status':
      return {
        action: 'response:status',
        state: STATE.IDLE
      };
    default: 
      return {
        action: 'response:unknown',
        payload: `Unknown action: ${message.action}`
      };
  }
}


function main() {
  const logger = new Logger(`Worker-${threadId}`);
  
  logger.debug(`Worker started - Worker-${threadId}`);

  parentPort?.on('message', async (message) => {
    logger.debug(`Worker-${threadId} received message: ${JSON.stringify(message)}`);

    const response = await messageReducer(message);
    parentPort?.postMessage(response);
  });

  const setupResponse: WorkerResponse = {
    action: 'response:status',
    state: STATE.IDLE
  };

  parentPort?.postMessage(setupResponse);
}

main();