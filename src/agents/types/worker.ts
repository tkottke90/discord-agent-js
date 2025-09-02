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

export type WorkerRequest<T = unknown> =
  // Status check
  | { action: 'status' }
  // Terminate request
  | { action: 'terminate' }
  // Chat request
  | { action: 'chat'; payload: T }
  // Generate request
  | { action: 'generate'; payload: T }
  // Embed request
  | { action: 'embed'; payload: T };

export type WorkerResponse<T = unknown> =
  // Ready
  | { action: 'response:ready' }
  // Response to a status check
  | { action: 'response:status'; state: STATE }
  // Response to a terminate request
  | { action: 'response:terminate' }
  // Response to a chat request
  | { action: 'response:chat'; payload: T }
  // Response to a generate request
  | { action: 'response:generate'; payload: T }
  // Response to an embed request
  | { action: 'response:embed'; payload: T }
  // Response to an unknown request
  | { action: 'response:unknown'; payload: string };
