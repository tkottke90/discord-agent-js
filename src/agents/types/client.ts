import { z } from 'zod';
import { Logger } from '../../utils/logging.js';

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
}

export interface StandardChatResponse {
  content: string;
  finish_reason?: string;
  metadata: {
    [key: string]: unknown;

    // Token Consumption
    totalToken: number;
    promptToken?: number;
    completionToken?: number;
  };
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
   * Generate an embedding from a text input.
   * @param request 
   */
  abstract embed(request: unknown): Promise<unknown>;

  /**
   * Generate a completion for a given prompt.
   * @param request 
   */
  abstract generate(request: unknown): Promise<unknown>;

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