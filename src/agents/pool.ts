import { Worker } from 'node:worker_threads';

interface WorkerConfig {
  engine: string;
  baseUrl: string;
  auth?: string;
}

const workerPool: Map<string, Worker> = new Map();

export function addWorker(workerId: string, config: WorkerConfig) {
  workerPool.set(workerId, new Worker('./worker.ts', { workerData: config }));
}

export function count() {
  return workerPool.size;
}

export function hasWorker(workerId: string) {
  return workerPool.has(workerId);
}

export function getWorker(workerId: string) {
  if (!workerPool.has(workerId)) {
    throw new Error(`Worker ${workerId} not found`);
  }

  return workerPool.get(workerId)!
}

export function keys() {
  return workerPool.keys();
}

export function releaseWorker(workerId: string) {
  if (workerPool.has(workerId)) {
    workerPool.get(workerId)?.terminate();
    workerPool.delete(workerId);
  }
}

export function triggerWorker(workerId: string, message: unknown) {
  if (workerPool.has(workerId)) {
    const worker = workerPool.get(workerId)!;

    worker.postMessage({
      action: 'status'
    });
  }
  
  if (!workerPool.has(workerId)) {
    throw new Error(`Worker ${workerId} not found`);
  }

  workerPool.get(workerId)?.postMessage(message);
}