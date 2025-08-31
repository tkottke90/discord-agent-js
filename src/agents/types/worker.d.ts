export interface WorkerConfig {
  engine: string;
  baseUrl: string;
  auth?: string;
}

export enum STATE {
  IDLE,
  BUSY,
  TERMINATING
}