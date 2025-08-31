// Digital Ocean AI Agent API TypeScript Definitions
// Generated from OpenAPI specification: https://udubprby3wudv76jcukm3geo.agents.do-ai.run/openapi.json

// Base types
export interface Message {
  /** Unique identifier for the message */
  id?: string;
  /** The role of the message sender (user, assistant, system, or developer) */
  role: string;
  /** The content of the message */
  content: string;
  /** Timestamp when the message was sent */
  sentTime?: string;
}

export interface ValidationError {
  /** Location of the validation error */
  loc: (string | number)[];
  /** Error message */
  msg: string;
  /** Type of error */
  type: string;
}

export interface HTTPValidationError {
  /** Array of validation error details */
  detail?: ValidationError[];
}

// Knowledge Base and Filtering types
export interface KBFilter {
  /** The index (UUID) of the knowledge base to retrieve data from */
  index: string;
  /** Optional file/directory path to retrieve data from */
  path?: string;
}

export interface FilteredGuardrail {
  /** Guardrail identifier */
  id: string;
  /** Index identifier */
  index: string;
  /** Confidence score */
  score: number;
}

// Guardrails types
export interface ViolationDetail {
  /** Human-readable violation description */
  message: string;
  /** Identifier of the violated rule */
  rule_name: string;
}

export interface GuardrailsMeta {
  /** List of triggered guardrails */
  triggered_guardrails: ViolationDetail[];
}

// Functions metadata
export interface FunctionsMeta {
  /** List of function names that were called */
  called_functions: string[];
}

// Retrieval metadata
export interface RetrievalMeta {
  /** List of retrieved data with filtering information */
  retrieved_data: FilteredGuardrail[];
}

// Usage metadata
export interface UsageMeta {
  /** Number of tokens in the prompt */
  prompt_tokens: number;
  /** Number of tokens in the completion */
  completion_tokens: number;
  /** Total tokens used (prompt + completion) */
  total_tokens: number;
}

// Stream options
export interface StreamOptions {
  /** If true, includes token usage information in the response */
  include_usage?: boolean;
}

// Choice types for responses
export interface StreamChoice {
  /** Delta message for streaming responses */
  delta: Message;
  /** Index of the choice */
  index: number;
  /** Reason why the generation finished */
  finish_reason: string | null;
}

export interface NonStreamChoice {
  /** Complete message for non-streaming responses */
  message: Message;
  /** Index of the choice */
  index: number;
}

// Request types
export type RetrievalMethod = 'rewrite' | 'step_back' | 'sub_queries' | 'none';

export interface ChatCompletionRequest {
  /** List of messages representing the conversation history */
  messages: Message[];
  /** Sampling temperature (0-2). Higher values make output more random */
  temperature?: number | null;
  /** Nucleus sampling threshold. Only top tokens with cumulative probability up to top_p are considered */
  top_p?: number | null;
  /** Maximum tokens to generate in the completion */
  max_tokens?: number | null;
  /** Maximum tokens to generate in the completion (interchangeable with max_tokens) */
  max_completion_tokens?: number | null;
  /** If true, streams the response; otherwise returns it as a single JSON object */
  stream?: boolean | null;
  /** Top results to return from the agent's associated knowledge bases */
  k?: number | null;
  /** Strategy for retrieval-augmented generation */
  retrieval_method?: RetrievalMethod | null;
  /** Penalty for new tokens based on their existing frequency (-2.0 to 2.0) */
  frequency_penalty?: number | null;
  /** Penalty for new tokens based on their presence (-2.0 to 2.0) */
  presence_penalty?: number | null;
  /** Stop sequences that the model should stop generating at */
  stop?: string | string[] | null;
  /** Optional parameters for controlling the stream response */
  stream_options?: StreamOptions | null;
  /** Filters to apply to the knowledge base */
  kb_filters?: KBFilter[] | null;
  /** If true, metadata is extracted from the query and used to filter KB data */
  filter_kb_content_by_query_metadata?: boolean | null;
  /** Override the default instruction for the agent */
  instruction_override?: string | null;
  /** If true, includes metadata about called functions in the response */
  include_functions_info?: boolean | null;
  /** If true, includes metadata about retrieved documents in the response */
  include_retrieval_info?: boolean | null;
  /** If true, includes metadata about guardrails triggered in the response */
  include_guardrails_info?: boolean | null;
  /** If true, includes citations within the response */
  provide_citations?: boolean | null;
}

// Response types
export interface ChatCompletionResponse {
  /** Unique identifier for the completion */
  id: string;
  /** Object type (e.g., "chat.completion") */
  object: string;
  /** Unix timestamp of when the completion was created */
  created: number;
  /** Model used for the completion */
  model: string;
  /** Array of completion choices */
  choices: StreamChoice[] | NonStreamChoice[];
  /** Metadata about triggered guardrails */
  guardrails: GuardrailsMeta;
  /** Metadata about called functions */
  functions: FunctionsMeta;
  /** Metadata about retrieved documents */
  retrieval: RetrievalMeta;
  /** Token usage information */
  usage: UsageMeta | null;
}

// Health check response
export interface HealthResponse {
  /** Status of the API */
  status: string;
}

// API Error types
export interface DOAIError {
  error: string;
  code?: number;
}

// Streaming response types
export type StreamingResponse<T> = AsyncIterable<T>;

// Main Digital Ocean AI client interface
export interface DOAIClient {
  /**
   * Generate AI response based on query, conversation history, and additional factors.
   *
   * This endpoint generates responses using routing, function-calling, and document retrieval
   * capabilities. It supports both streaming and non-streaming responses.
   *
   * @param request - The chat completion request configuration
   * @returns Promise resolving to the completion response
   */
  chatCompletions(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;

  /**
   * Generate AI response with streaming.
   *
   * @param request - The chat completion request with stream: true
   * @returns AsyncIterable yielding streaming completion responses
   */
  chatCompletionsStream(request: ChatCompletionRequest & { stream: true }): StreamingResponse<ChatCompletionResponse>;

  /**
   * Check the health status of the API.
   *
   * @returns Promise resolving to health status
   */
  health(): Promise<HealthResponse>;
}

// Configuration types
export interface DOAIConfig extends LLMClientConfig {
  /** Bearer token for authentication */
  token: string;
}

// Utility types for type guards
export type StreamingChatResponse = ChatCompletionResponse & { choices: StreamChoice[] };
export type NonStreamingChatResponse = ChatCompletionResponse & { choices: NonStreamChoice[] };

// Re-export commonly used types
export type {
  Message,
  KBFilter,
  RetrievalMethod,
  StreamOptions,
  UsageMeta,
  GuardrailsMeta,
  FunctionsMeta,
  RetrievalMeta
};
