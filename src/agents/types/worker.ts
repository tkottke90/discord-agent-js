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
  INITIALIZING,
  IDLE,
  BUSY,
  TERMINATING,
}

export enum RESPONSE_TYPE {
  SEND_CHANNEL,
  SEND_USER,
  REPLY_MESSAGE
}


export interface ChatPayload {
  channelId: string;
  userId: string;
  messageId: string;
  response: RESPONSE_TYPE;
  messages: { role: string; content: string }[];
}

export type ChatResponse =
  // Send to Channel
  | { type: 'send:channel'; channelId: string; message: string }
  // Send to User
  | { type: 'send:user'; userId: string; message: string }
  // Reply to Message
  | { type: 'reply:message'; messageId: string; message: string };

export type WorkerRequest<T = unknown> =
  // Status check
  | { action: 'status' }
  // Terminate request
  | { action: 'terminate' }
  // Chat request
  | { action: 'chat'; payload: ChatPayload }
  // Generate request
  | { action: 'generate'; payload: T }
  // Embed request
  | { action: 'embed'; payload: T };

export type WorkerResponse<T = unknown> =
  // Ready
  | { action: 'response:ready' }
  // Response to a job completion
  | { action: 'response:complete'; job: string }
  // Response to a terminate request
  | { action: 'response:terminate' }
  // Response to a chat request
  | { action: 'response:chat'; payload: ChatResponse }
  // Response to a generate request
  | { action: 'response:generate'; payload: T }
  // Response to an embed request
  | { action: 'response:embed'; payload: T }
  // Response to an unknown request
  | { action: 'response:unknown'; payload: string }
  // Response when there is an error
  | { action: 'response: error'; message: string };
