import { z } from 'zod';
import { Logger } from '../../utils/logging.js';
import { JSONSchema, ToolCall } from './chat.js';

export interface StandardUsage {
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  }
}

export interface StandardMessage {
  role: string;
  content: string;
}

export interface StandardChatRequest {
  messages: StandardMessage[];
  temperature?: number;
  top_k?: number;
  top_p?: number;
  max_tokens?: number;
  format?: 'json' | JSONSchema;
}

export interface StandardChatResponse extends StandardUsage {
  content: string;
  finish_reason?: string;
  tool_calls?: ToolCall[];
}

export interface StandardGenerateRequest {
  // Core required field
  prompt: string;
  
  // Common optional fields (same as chat)
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  
  // Generate-specific optional fields
  system?: string;        // System prompt/instructions
  suffix?: string;        // Text after response (for code completion)
}

export interface StandardGenerateResponse extends StandardUsage {
  // Core response
  content: string;
  finish_reason?: string;
}

export interface StandardEmbedRequest {
  // Core required field
  input: string | string[];

  // Optional fields
  truncate?: boolean;     // Whether to truncate input to fit context
}

export interface StandardEmbedResponse extends StandardUsage {
  // Core response - array of embedding vectors
  embeddings: number[][];
}

export const LLMClientConfigSchema = z.object({
  engine: z.string().min(1),
  baseUrl: z.string().min(1),
  timeout: z.number().positive().int().default(30000),
  headers: z.record(z.string(), z.string()).optional(),
  auth: z.object({
    // Adds an HTTP Basic Auth
    basic: z.string().min(1).optional(),
    
    // Adds an HTTP Bearer Token
    bearer: z.string().min(1).optional(),
  }).optional()
});


export abstract class LLMClient<
  Config extends z.infer<typeof LLMClientConfigSchema>,
  ChatRequest extends StandardChatRequest,
  ChatResponse extends StandardChatResponse
> {
  constructor(
    protected readonly config: Config,
    protected readonly logger: Logger
  ){}

  /**
   * Generate a chat response based on the conversation history
   * @param request 
   */
  abstract chat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * Generate embeddings from text input(s).
   * Override this method in engines that support embeddings.
   * @param request - The embedding request
   * @throws Error if not implemented by the engine
   */
  embed(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _request: StandardEmbedRequest
  ): Promise<StandardEmbedResponse> {
    throw new Error(`Embedding not supported by ${this.constructor.name}`);
  }

  /**
   * Generate a completion for a given prompt.
   * @param request 
   */
  abstract generate(request: StandardGenerateRequest): Promise<StandardGenerateResponse>;

  /**
   * Engines use a set of parameters including temperature, top_k, top_p
   * to control the behavior of the LLM model.  These numbers are typically
   * between 0 and 1 and this function helps us normalize them before sending
   * them to the engine.
   * @param param 
   * @returns 
   */
  normalizeNumericParameters(param: number) {
    return Math.min(Math.max(param, 0), 1);
  }
}