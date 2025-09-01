// Ollama API TypeScript Definitions
// Based on official Ollama API documentation
import type {
  JSONSchema,
  Tool,
  ToolCall,
  ToolFunction,
  Message,
  MessageRole,
  ChatRequest,
} from './chat.js';

// Common types
export interface ModelOptions {
  num_keep?: number;
  seed?: number;
  num_predict?: number;
  top_k?: number;
  top_p?: number;
  min_p?: number;
  typical_p?: number;
  repeat_last_n?: number;
  temperature?: number;
  repeat_penalty?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  penalize_newline?: boolean;
  stop?: string[];
  numa?: boolean;
  num_ctx?: number;
  num_batch?: number;
  num_gpu?: number;
  main_gpu?: number;
  use_mmap?: boolean;
  num_thread?: number;
}

export interface ModelDetails {
  parent_model: string;
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

export interface ModelInfo {
  [key: string]: unknown;
  'general.architecture'?: string;
  'general.file_type'?: number;
  'general.parameter_count'?: number;
  'general.quantization_version'?: number;
  'llama.attention.head_count'?: number;
  'llama.attention.head_count_kv'?: number;
  'llama.attention.layer_norm_rms_epsilon'?: number;
  'llama.block_count'?: number;
  'llama.context_length'?: number;
  'llama.embedding_length'?: number;
  'llama.feed_forward_length'?: number;
  'llama.rope.dimension_count'?: number;
  'llama.rope.freq_base'?: number;
  'llama.vocab_size'?: number;
  'tokenizer.ggml.bos_token_id'?: number;
  'tokenizer.ggml.eos_token_id'?: number;
  'tokenizer.ggml.merges'?: string[];
  'tokenizer.ggml.model'?: string;
  'tokenizer.ggml.pre'?: string;
  'tokenizer.ggml.token_type'?: number[];
  'tokenizer.ggml.tokens'?: string[];
}

// Generate completion types
export interface GenerateRequest {
  model: string;
  prompt?: string;
  suffix?: string;
  images?: string[];
  think?: boolean; // for thinking models
  format?: 'json' | JSONSchema;
  options?: ModelOptions;
  system?: string;
  template?: string;
  stream?: boolean;
  raw?: boolean;
  keep_alive?: string | number;
  context?: number[]; // deprecated
}

export interface GenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason?: 'stop' | 'length' | 'load' | 'unload';
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface ChatResponse {
  model: string;
  created_at: string;
  message: Message;
  done: boolean;
  done_reason?: 'stop' | 'length' | 'load' | 'unload';
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

// Create model types
export interface CreateModelRequest {
  model: string;
  from?: string;
  files?: Record<string, string>; // filename -> SHA256 digest
  adapters?: Record<string, string>; // filename -> SHA256 digest for LORA adapters
  template?: string;
  license?: string | string[];
  system?: string;
  parameters?: Record<string, unknown>;
  messages?: Message[];
  stream?: boolean;
  quantize?: 'q4_K_M' | 'q4_K_S' | 'q8_0';
}

export interface CreateModelResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

// List models types
export interface Model {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: ModelDetails;
  expires_at?: string; // for running models
  size_vram?: number; // for running models
}

export interface ListModelsResponse {
  models: Model[];
}

// Show model types
export interface ShowModelRequest {
  model: string;
  verbose?: boolean;
}

export interface ShowModelResponse {
  modelfile: string;
  parameters: string;
  template: string;
  details: ModelDetails;
  model_info: ModelInfo;
  capabilities: string[];
}

// Copy model types
export interface CopyModelRequest {
  source: string;
  destination: string;
}

// Delete model types
export interface DeleteModelRequest {
  model: string;
}

// Pull model types
export interface PullModelRequest {
  model: string;
  insecure?: boolean;
  stream?: boolean;
}

export interface PullModelResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

// Push model types
export interface PushModelRequest {
  model: string;
  insecure?: boolean;
  stream?: boolean;
}

export interface PushModelResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

// Embeddings types
export interface EmbedRequest {
  model: string;
  input: string | string[];
  truncate?: boolean;
  options?: ModelOptions;
  keep_alive?: string | number;
}

export interface EmbedResponse {
  model: string;
  embeddings: number[][];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
}

// Legacy embeddings endpoint (deprecated)
export interface EmbeddingsRequest {
  model: string;
  prompt: string;
  options?: ModelOptions;
  keep_alive?: string | number;
}

export interface EmbeddingsResponse {
  embedding: number[];
}

// Version types
export interface VersionResponse {
  version: string;
}

// Blob types
export interface BlobExistsParams {
  digest: string;
}

export interface PushBlobParams {
  digest: string;
}

// Streaming response types
export type StreamingResponse<T> = AsyncIterable<T>;

// API Error types
export interface OllamaError {
  error: string;
  code?: number;
}

// Main Ollama client interface
export interface OllamaClient {
  // Generate completion
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  generateStream(
    request: GenerateRequest & { stream: true },
  ): StreamingResponse<GenerateResponse>;

  // Chat completion
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(
    request: ChatRequest & { stream: true },
  ): StreamingResponse<ChatResponse>;

  // Model management
  create(request: CreateModelRequest): Promise<CreateModelResponse>;
  createStream(
    request: CreateModelRequest & { stream: true },
  ): StreamingResponse<CreateModelResponse>;
  list(): Promise<ListModelsResponse>;
  show(request: ShowModelRequest): Promise<ShowModelResponse>;
  copy(request: CopyModelRequest): Promise<void>;
  delete(request: DeleteModelRequest): Promise<void>;
  pull(request: PullModelRequest): Promise<PullModelResponse>;
  pullStream(
    request: PullModelRequest & { stream: true },
  ): StreamingResponse<PullModelResponse>;
  push(request: PushModelRequest): Promise<PushModelResponse>;
  pushStream(
    request: PushModelRequest & { stream: true },
  ): StreamingResponse<PushModelResponse>;

  // Embeddings
  embed(request: EmbedRequest): Promise<EmbedResponse>;
  embeddings(request: EmbeddingsRequest): Promise<EmbeddingsResponse>; // deprecated

  // Running models
  ps(): Promise<ListModelsResponse>;

  // Version
  version(): Promise<VersionResponse>;

  // Blob operations
  blobExists(params: BlobExistsParams): Promise<boolean>;
  pushBlob(params: PushBlobParams, data: Blob | Buffer): Promise<void>;
}

// Utility types for type guards
export type GenerateStreamResponse =
  | (GenerateResponse & { done: false })
  | (GenerateResponse & { done: true });
export type ChatStreamResponse =
  | (ChatResponse & { done: false })
  | (ChatResponse & { done: true });

// Re-export commonly used types
export type {
  ModelOptions,
  ModelDetails,
  GenerateRequest,
  GenerateResponse,
  ChatRequest,
  ChatResponse,
  ModelInfo,
  JSONSchema,
  Tool,
  ToolCall,
  ToolFunction,
  Message,
  MessageRole,
  Model,
};
