import z from 'zod';
import { Logger } from '../../utils/logging.js';
import {
  LLMClient,
  LLMClientConfigSchema,
  StandardChatRequest,
  StandardChatResponse,
  StandardGenerateRequest,
  StandardGenerateResponse,
  StandardEmbedRequest,
  StandardEmbedResponse,
} from '../types/client.js';
import * as OllamaTypes from '../types/ollama.js';

export const OllamaConfigSchema = LLMClientConfigSchema.clone();

export type OllamaConfig = z.infer<typeof OllamaConfigSchema>;

/**
 * Ollama API Client
 * Implements the complete Ollama API with support for streaming, chat, embeddings, and model management
 */
export class OllamaClient extends LLMClient<
  OllamaConfig,
  StandardChatRequest,
  StandardChatResponse
> {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;

  constructor(config: OllamaConfig) {
    super(new Logger('OllamaClient'), OllamaConfigSchema, config);

    this.baseUrl = this.config.baseUrl;
    this.timeout = this.config.timeout;
    this.headers = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    this.logger.debug(
      `Initialized (baseUrl=${this.baseUrl}, timeout=${this.timeout})`,
    );
  }

  // PUBLIC METHODS (sorted alphabetically)

  /**
   * Check if a blob exists on the server.
   */
  async blobExists(params: OllamaTypes.BlobExistsParams): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/blobs/${params.digest}`,
        {
          method: 'HEAD',
          headers: this.headers,
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate the next message in a chat conversation.
   */
  async chat(request: StandardChatRequest): Promise<StandardChatResponse> {
    this.logger.debug('Making chat request');

    const ollamaRequest = this.convertChatRequest(request);
    const response = await this.request<OllamaTypes.ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(ollamaRequest),
    });

    return this.convertChatResponse(response);
  }

  /**
   * Generate a chat response with streaming.
   */
  chatStream(
    request: OllamaTypes.ChatRequest & { stream: true },
  ): OllamaTypes.StreamingResponse<OllamaTypes.ChatResponse> {
    const requestBody = { ...request, stream: true };
    return this.requestStream<OllamaTypes.ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Generate embeddings from text input(s).
   */
  async embed(request: StandardEmbedRequest): Promise<StandardEmbedResponse> {
    this.logger.debug('Making embed request');

    const ollamaRequest = this.convertEmbedRequest(request);
    const response = await this.request<OllamaTypes.EmbedResponse>(
      '/api/embed',
      {
        method: 'POST',
        body: JSON.stringify(ollamaRequest),
      },
    );

    return this.convertEmbedResponse(response);
  }

  /**
   * Generate embeddings using the legacy API endpoint.
   * @deprecated Use the `embed` method instead.
   */
  async embeddings(
    request: OllamaTypes.EmbeddingsRequest,
  ): Promise<OllamaTypes.EmbeddingsResponse> {
    return this.request<OllamaTypes.EmbeddingsResponse>('/api/embeddings', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Generate a completion for a given prompt.
   */
  async generate(
    request: StandardGenerateRequest,
  ): Promise<StandardGenerateResponse> {
    this.logger.debug('Making generate request');

    const ollamaRequest = this.convertGenerateRequest(request);
    const response = await this.request<OllamaTypes.GenerateResponse>(
      '/api/generate',
      {
        method: 'POST',
        body: JSON.stringify(ollamaRequest),
      },
    );

    return this.convertGenerateResponse(response);
  }

  /**
   * Generate a completion with streaming response.
   */
  generateStream(
    request: OllamaTypes.GenerateRequest & { stream: true },
  ): OllamaTypes.StreamingResponse<OllamaTypes.GenerateResponse> {
    const requestBody = { ...request, stream: true };
    return this.requestStream<OllamaTypes.GenerateResponse>('/api/generate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * List models that are available locally.
   */
  async list(): Promise<OllamaTypes.ListModelsResponse> {
    return this.request<OllamaTypes.ListModelsResponse>('/api/tags', {
      method: 'GET',
    });
  }

  /**
   * List models that are currently loaded into memory.
   */
  async ps(): Promise<OllamaTypes.ListModelsResponse> {
    return this.request<OllamaTypes.ListModelsResponse>('/api/ps', {
      method: 'GET',
    });
  }

  /**
   * Download a model from the Ollama library.
   */
  async pull(
    request: OllamaTypes.PullModelRequest,
  ): Promise<OllamaTypes.PullModelResponse> {
    const requestBody = { ...request, stream: false };
    return this.request<OllamaTypes.PullModelResponse>('/api/pull', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Upload a blob to the Ollama server.
   */
  async pushBlob(
    params: OllamaTypes.PushBlobParams,
    data: Blob | Buffer,
  ): Promise<void> {
    const body = data as BodyInit;

    await this.request<void>(`/api/blobs/${params.digest}`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/octet-stream',
      },
      body,
    });
  }

  /**
   * Show detailed information about a model.
   */
  async show(
    request: OllamaTypes.ShowModelRequest,
  ): Promise<OllamaTypes.ShowModelResponse> {
    return this.request<OllamaTypes.ShowModelResponse>('/api/show', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get the Ollama server version.
   */
  async version(): Promise<OllamaTypes.VersionResponse> {
    return this.request<OllamaTypes.VersionResponse>('/api/version', {
      method: 'GET',
    });
  }

  // PRIVATE METHODS (sorted alphabetically)

  /**
   * Convert StandardChatRequest to Ollama format
   */
  private convertChatRequest(
    request: StandardChatRequest,
  ): OllamaTypes.ChatRequest {
    const messages: OllamaTypes.Message[] = request.messages.map(msg => ({
      role: msg.role as OllamaTypes.MessageRole,
      content: msg.content,
    }));

    const ollamaRequest: OllamaTypes.ChatRequest = {
      model: 'llama3.2', // Default model, could be configurable
      messages,
      stream: false,
    };

    // Add optional parameters if provided
    if (
      request.temperature !== undefined ||
      request.top_p !== undefined ||
      request.max_tokens !== undefined
    ) {
      ollamaRequest.options = {
        ...(request.temperature !== undefined && {
          temperature: request.temperature,
        }),
        ...(request.top_p !== undefined && { top_p: request.top_p }),
        ...(request.max_tokens !== undefined && {
          num_predict: request.max_tokens,
        }),
      };
    }

    return ollamaRequest;
  }

  /**
   * Convert Ollama ChatResponse to StandardChatResponse
   */
  private convertChatResponse(
    response: OllamaTypes.ChatResponse,
  ): StandardChatResponse {
    const result: StandardChatResponse = {
      content: response.message.content,
      usage: {
        prompt_tokens: response.prompt_eval_count || 0,
        completion_tokens: response.eval_count || 0,
        total_tokens:
          (response.prompt_eval_count || 0) + (response.eval_count || 0),
      },
    };

    if (response.done) {
      result.finish_reason = 'stop';
    }

    return result;
  }

  /**
   * Convert StandardEmbedRequest to Ollama format
   */
  private convertEmbedRequest(
    request: StandardEmbedRequest,
  ): OllamaTypes.EmbedRequest {
    const ollamaRequest: OllamaTypes.EmbedRequest = {
      model: 'all-minilm', // Default embedding model, could be configurable
      input: request.input,
    };

    if (request.truncate !== undefined) {
      ollamaRequest.truncate = request.truncate;
    }

    return ollamaRequest;
  }

  /**
   * Convert Ollama EmbedResponse to StandardEmbedResponse
   */
  private convertEmbedResponse(
    response: OllamaTypes.EmbedResponse,
  ): StandardEmbedResponse {
    return {
      embeddings: response.embeddings,
      usage: {
        prompt_tokens: response.prompt_eval_count || 0,
        total_tokens: response.prompt_eval_count || 0,
      },
    };
  }

  /**
   * Convert StandardGenerateRequest to Ollama format
   */
  private convertGenerateRequest(
    request: StandardGenerateRequest,
  ): OllamaTypes.GenerateRequest {
    const ollamaRequest: OllamaTypes.GenerateRequest = {
      model: 'llama3.2', // Default model, could be configurable
      prompt: request.prompt,
      stream: false,
    };

    // Add optional parameters if provided
    if (request.system) {
      ollamaRequest.system = request.system;
    }

    if (request.suffix) {
      ollamaRequest.suffix = request.suffix;
    }

    if (
      request.temperature !== undefined ||
      request.top_p !== undefined ||
      request.max_tokens !== undefined
    ) {
      ollamaRequest.options = {
        ...(request.temperature !== undefined && {
          temperature: request.temperature,
        }),
        ...(request.top_p !== undefined && { top_p: request.top_p }),
        ...(request.max_tokens !== undefined && {
          num_predict: request.max_tokens,
        }),
      };
    }

    return ollamaRequest;
  }

  /**
   * Convert Ollama GenerateResponse to StandardGenerateResponse
   */
  private convertGenerateResponse(
    response: OllamaTypes.GenerateResponse,
  ): StandardGenerateResponse {
    const result: StandardGenerateResponse = {
      content: response.response,
      usage: {
        prompt_tokens: response.prompt_eval_count || 0,
        completion_tokens: response.eval_count || 0,
        total_tokens:
          (response.prompt_eval_count || 0) + (response.eval_count || 0),
      },
    };

    if (response.done) {
      result.finish_reason = 'stop';
    }

    return result;
  }

  /**
   * Make HTTP request to Ollama API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorBody = (await response.json()) as OllamaTypes.OllamaError;
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
   * Make streaming HTTP request to Ollama API
   */
  private async *requestStream<T>(
    endpoint: string,
    options: RequestInit = {},
  ): OllamaTypes.StreamingResponse<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorBody = (await response.json()) as OllamaTypes.OllamaError;
          errorMessage = errorBody.error || errorMessage;
        } catch {
          // Ignore JSON parsing errors for error responses
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                yield JSON.parse(line) as T;
              } catch (error) {
                console.warn(
                  'Failed to parse streaming response line:',
                  line,
                  error,
                );
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            yield JSON.parse(buffer) as T;
          } catch (error) {
            console.warn(
              'Failed to parse final streaming response:',
              buffer,
              error,
            );
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }
}
