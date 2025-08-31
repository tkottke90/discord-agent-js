import { WorkerPool } from './pool';
import ConfigurationFile from 'config';
import type { WorkerPoolConfig } from './types/worker';
import { Logger } from '../utils/logging';

// Create Pool Singleton
const pool = new WorkerPool();
const logger = new Logger('Agents');

// Initialize Pool
export function initialize() {
  logger.debug('Initializing Agents...');

  const workers = ConfigurationFile.get<WorkerPoolConfig>('workers');

  logger.debug(`Adding ${workers.min} workers`);
  for (let i = 0; i < workers.min; i++) {
    pool.addWorker();
  }
}

// Share pool with rest of app
export function getPool() {
  return pool;
}
