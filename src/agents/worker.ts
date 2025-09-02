import { parentPort, threadId } from 'node:worker_threads';
import { Logger } from '../utils/logging.js';
import { STATE, WorkerRequest, WorkerResponse } from './types/worker.js';

async function messageReducer(message: WorkerRequest): Promise<WorkerResponse> {
  switch (message.action) {
    case 'status':
      return {
        action: 'response:status',
        state: STATE.IDLE,
      };
    default:
      return {
        action: 'response:unknown',
        payload: `Unknown action: ${message.action}`,
      };
  }
}

function main() {
  const logger = new Logger(`Worker-${threadId}`);

  logger.debug(`Worker started - Worker-${threadId}`);

  parentPort?.on('message', async message => {
    logger.debug(
      `Received message: ${JSON.stringify(message)}`,
    );

    const response = await messageReducer(message);
    parentPort?.postMessage(response);
  });

  const setupResponse: WorkerResponse = {
    action: 'response:ready',
  };

  parentPort?.postMessage(setupResponse);
}

main();
