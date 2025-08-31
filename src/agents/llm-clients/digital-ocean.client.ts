import z from 'zod';
import { Logger } from '../../utils/logging';
import { LLMClientConfigSchema } from '../types/client-config';
import * as DOAITypes from '../types/digital-ocean-ai';
import { prettyZodErrors } from '../../utils/zod-errors';

export const DOAIConfigSchema = LLMClientConfigSchema.extend({
  auth: z.object({
    bearer: z.string().min(1, 'Bearer token is required')
  })
});

export type DOAIConfig = z.infer<typeof DOAIConfigSchema>;

/**
 * Digital Ocean AI Agent API Client
 * Implements the complete Digital Ocean AI Agent API with support for chat completions,
 * streaming responses, knowledge base retrieval, function calling, and guardrails.
 */
export class DigitalOceanAIClient implements DOAITypes.DOAIClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;
  private readonly logger: Logger;

  constructor(config: DOAIConfig) {
    this.logger = new Logger('DigitalOceanAIClient');

    const parsedConfig = DOAIConfigSchema.safeParse(config);

    if (!parsedConfig.success) {
      this.logger.error(`Errors in Digital Ocean AI config: ${prettyZodErrors(parsedConfig.error)}}`);
      throw new Error('FATAL: Invalid Digital Ocean AI config provided');
    }

    const {
      baseUrl,
      timeout,
      headers,
      auth
    } = parsedConfig.data;

    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.bearer}`,
      ...headers
    };

    this.logger.debug(`Initialized (baseUrl=${this.baseUrl}, timeout=${this.timeout})`);
  }

  /**
   * Make HTTP request to Digital Ocean AI API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorBody = await response.json() as DOAITypes.DOAIError;
          errorMessage = errorBody.error || errorMessage;
        } catch {
          // Ignore JSON parsing errors for error responses
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Generate AI response based on query, conversation history, and additional factors.
   *
   * This endpoint generates responses using routing, function-calling, and document retrieval
   * capabilities. It supports knowledge base filtering, guardrails, and various retrieval methods.
   *
   * @param request - The chat completion request configuration
   * @param request.messages - (required) List of messages representing the conversation history
   * @param request.temperature - Sampling temperature (0-2). Higher values make output more random
   * @param request.top_p - Nucleus sampling threshold for token selection
   * @param request.max_tokens - Maximum tokens to generate in the completion
   * @param request.stream - If true, streams the response; otherwise returns single JSON object
   * @param request.k - Top results to return from knowledge bases
   * @param request.retrieval_method - Strategy for retrieval-augmented generation
   * @param request.kb_filters - Filters to apply to the knowledge base
   * @param request.instruction_override - Override the default agent instruction
   * @param request.include_functions_info - Include metadata about called functions
   * @param request.include_retrieval_info - Include metadata about retrieved documents
   * @param request.include_guardrails_info - Include metadata about triggered guardrails
   * @param request.provide_citations - Include citations within the response
   *
   * @returns Promise resolving to the completion response
   *
   * @example Basic chat
   * ```typescript
   * const response = await client.chatCompletions({
   *   messages: [
   *     { role: 'user', content: 'What is artificial intelligence?' }
   *   ]
   * });
   * console.log(response.choices[0].message.content);
   * ```
   *
   * @example With knowledge base filtering
   * ```typescript
   * const response = await client.chatCompletions({
   *   messages: [
   *     { role: 'user', content: 'Tell me about our company policies' }
   *   ],
   *   kb_filters: [
   *     { index: '0000000-0000-0000-0000-000000000000', path: 'policies/' }
   *   ],
   *   k: 5,
   *   retrieval_method: 'rewrite'
   * });
   * ```
   *
   * @example With function calling and guardrails
   * ```typescript
   * const response = await client.chatCompletions({
   *   messages: [
   *     { role: 'user', content: 'What is the weather like today?' }
   *   ],
   *   include_functions_info: true,
   *   include_guardrails_info: true,
   *   provide_citations: true
   * });
   * ```
   */
  async chatCompletions<Choices extends DOAITypes.StreamChoice[] | DOAITypes.NonStreamChoice[]>(request: DOAITypes.ChatCompletionRequest) {
    const requestBody = { ...request, stream: false };
    return this.request<DOAITypes.ChatCompletionResponse<Choices>>('/api/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  }

  getOpenAIDocs() {
    return this.request('/api/v1/openai/docs', {
      method: 'GET'
    });
  }

  /**
   * Check the health status of the API.
   *
   * This endpoint is used to verify that the Digital Ocean AI Agent API is running
   * and healthy. It returns a status message indicating the API's operational state.
   *
   * @returns Promise resolving to health status
   *
   * @example
   * ```typescript
   * const health = await client.health();
   * console.log(`API Status: ${health.status}`);
   * ```
   */
  async health(): Promise<DOAITypes.HealthResponse> {
    return this.request<DOAITypes.HealthResponse>('/health', {
      method: 'GET'
    });
  }
}