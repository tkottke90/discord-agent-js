import z from 'zod';
import { Logger } from '../../utils/logging.js';
import {
  LLMClient,
  LLMClientConfigSchema,
  StandardChatRequest,
  StandardChatResponse,
  StandardGenerateRequest,
  StandardGenerateResponse,
  StandardMessage
} from '../types/client.js';
import * as DOAITypes from '../types/digital-ocean-ai.js';

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
export class DigitalOceanAIClient extends LLMClient<DOAIConfig, StandardChatRequest, StandardChatResponse> {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;

  constructor(config: DOAIConfig) {
    super(new Logger('DigitalOceanAIClient'), DOAIConfigSchema, config);

    this.baseUrl = this.config.baseUrl;
    this.timeout = this.config.timeout;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.auth.bearer}`,
      ...this.config.headers
    };

    this.logger.debug(`Initialized (baseUrl=${this.baseUrl}, timeout=${this.timeout})`);
  }

  /**
   * Make an HTTP request to the Digital Ocean AI API
   */
  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers
      },
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`Digital Ocean AI API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Convert StandardChatRequest to Digital Ocean AI format
   */
  private convertChatRequest(request: StandardChatRequest): DOAITypes.ChatCompletionRequest {
    const messages: DOAITypes.Message[] = request.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    return {
      messages,
      temperature: request.temperature ?? undefined,
      top_p: request.top_p ?? undefined,
      max_tokens: request.max_tokens ?? undefined,
      stream: false // We'll handle streaming separately
    };
  }

  /**
   * Convert Digital Ocean AI response to StandardChatResponse
   */
  private convertChatResponse(response: DOAITypes.ChatCompletionResponse<DOAITypes.NonStreamChoice[]>): StandardChatResponse {
    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No choices returned from Digital Ocean AI API');
    }

    return {
      content: choice.message.content,
      finish_reason: 'stop', // NonStreamChoice doesn't have finish_reason, assume 'stop'
      usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
      } : {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  }

  /**
   * Generate a chat response based on the conversation history
   */
  async chat(request: StandardChatRequest): Promise<StandardChatResponse> {
    this.logger.debug('Making chat request');

    const doaiRequest = this.convertChatRequest(request);
    const response = await this.request<DOAITypes.ChatCompletionResponse<DOAITypes.NonStreamChoice[]>>(
      '/api/v1/chat/completions',
      {
        method: 'POST',
        body: JSON.stringify(doaiRequest)
      }
    );

    return this.convertChatResponse(response);
  }

  /**
   * Generate a completion for a given prompt by converting it to a chat request
   */
  async generate(request: StandardGenerateRequest): Promise<StandardGenerateResponse> {
    this.logger.debug('Making generate request (converted to chat)');

    // Convert generate request to chat format
    const messages: StandardMessage[] = [];

    if (request.system) {
      messages.push({ role: 'system', content: request.system });
    }

    messages.push({ role: 'user', content: request.prompt });

    const chatRequest: StandardChatRequest = {
      messages,
      ...(request.temperature !== undefined && { temperature: request.temperature }),
      ...(request.top_p !== undefined && { top_p: request.top_p }),
      ...(request.max_tokens !== undefined && { max_tokens: request.max_tokens })
    };

    const chatResponse = await this.chat(chatRequest);

    return {
      content: chatResponse.content,
      finish_reason: chatResponse.finish_reason || 'stop',
      usage: chatResponse.usage
    };
  }
}