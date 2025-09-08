import { WorkerPool } from './pool.js';

// Create Pool Singleton
const pool = new WorkerPool();

// Initialize Pool
export async function initialize() {
  await pool.initialize();
}

// Share pool with rest of app
export function getPool() {
  return pool;
}
