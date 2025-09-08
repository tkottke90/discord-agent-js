/**
 * Worker Utilities
 * 
 * These are helper functions for managing workers 
 */

import { RedisClient } from '../../redis.js';
import { STATE } from '../types/worker.js';

export function getAllWorkers(redisClient: RedisClient) {
  return redisClient.keys('worker:*:status');
}

/**
 * Returns the list of jobs actively being worked on by workers.
 * @param redisClient 
 * @returns 
 */
export function getActiveWorkers(redisClient: RedisClient) {
  return redisClient.get('worker:*:job');
}

export function getWorkerJob(
  workerId: string,
  redisClient: RedisClient,
) {
  const workerJobKey = `worker:${workerId}:job`;
  return redisClient.get(workerJobKey);
}

export async function getWorkerStatus(
  workerId: string,
  redisClient: RedisClient,
) {
  const workerStatusKey = `worker:${workerId}:status`;
  
  const keyExists = (await redisClient.keys(workerStatusKey)).length > 0;

  if (!keyExists) {
    await redisClient.set(workerStatusKey, STATE.IDLE);
    return STATE.IDLE;
  }
  
  
  return redisClient.get(workerStatusKey).then(status => Number(status) || STATE.IDLE);
}

export function setWorkerJob(
  workerId: string,
  jobId: string,
  redisClient: RedisClient,
) {
  const workerJobKey = `worker:${workerId}:job`;
  return redisClient.set(workerJobKey, jobId);
}

export function setWorkerStatus(
  workerId: string,
  status: number,
  redisClient: RedisClient,
) {
  const workerStatusKey = `worker:${workerId}:status`;
  return redisClient.set(workerStatusKey, status);
}