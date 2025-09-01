export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: unknown[];
  description?: string;
}

// Tool calling types
export interface ToolFunction {
  name: string;
  description: string;
  parameters: JSONSchema;
}

export interface Tool {
  type: 'function';
  function: ToolFunction;
}

export interface ToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: MessageRole;
  content: string;
  thinking?: string; // for thinking models
  images?: string[]; // base64-encoded images for multimodal models
  tool_calls?: ToolCall[];
  tool_name?: string; // for tool response messages
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  tools?: Tool[];
  think?: boolean; // for thinking models
  format?: 'json' | JSONSchema;
  options?: ModelOptions;
  stream?: boolean;
  keep_alive?: string | number;
}
