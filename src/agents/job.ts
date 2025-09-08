import crypto from 'node:crypto';
import * as JobTypes from './types/pool.js';

export class Job implements JobTypes.Job {
  readonly createdAt: number = Date.now();
  readonly priority: number = 0;
  readonly data: JobTypes.Job['data'];
  readonly engine: string;

  constructor(config: JobTypes.CreateJob, readonly jobId: string = crypto.randomUUID()) {
    this.priority = config.priority ?? 0;
    this.data = config.data;
    this.engine = config.engine;
  } 

  get key() {
    return `job:${this.jobId}:${this.priority}:${this.createdAt}`;
  }

  toJSON() {
    return {
      jobId: this.jobId,
      data: this.data,
      engine: this.engine,
      priority: this.priority,
      createdAt: this.createdAt,
    };
  }

  static fromExisting(job: JobTypes.Job) {
    return new Job(job, job.jobId);
  } 

  static sortListByKeys(jobKeyList: string[]) {
    const parsedKeys = jobKeyList.reduce((output, jobKey) => {
      const [, jobId, priority, createdAt ] = jobKey.split(':');
      
      if (!jobId || !priority || !createdAt) {
        return output;
      }

      return output.concat([{
        jobId,
        jobKey,
        sortKey: `${priority}:${createdAt}`,
      }]);
    }, [] as Array<{ jobId: string, sortKey: string, jobKey: string }>)

    return parsedKeys.sort((a, b) => {
      if (a.sortKey === b.sortKey) {
        return 0;
      }
      return a.sortKey < b.sortKey ? -1 : 1;
    });
  }
}