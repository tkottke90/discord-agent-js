export interface WorkerPoolConfig {
  min: number;
  max: number;
}

export interface WorkerConfig {
  engine: string;
  baseUrl: string;
  auth?: string;
}

export enum STATE {
  IDLE,
  BUSY,
  TERMINATING,
}

export type WorkerRequest =
  | { action: 'status' }
  | { action: 'terminate' }
  | { action: 'chat'; payload: unknown }
  | { action: 'generate'; payload: unknown }
  | { action: 'embed'; payload: unknown };

export type WorkerResponse =
  | { action: 'response:status'; state: STATE }
  | { action: 'response:terminate' }
  | { action: 'response:chat'; payload: unknown }
  | { action: 'response:generate'; payload: unknown }
  | { action: 'response:embed'; payload: unknown }
  | { action: 'response:unknown'; payload: string };
