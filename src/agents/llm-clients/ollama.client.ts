import z from 'zod';
import { Logger } from '../../utils/logging';
import { LLMClientConfigSchema } from '../types/client-config';
import * as OllamaTypes from '../types/ollama';
import { WorkerConfig } from '../types/worker';

export const OllamaConfigSchema = LLMClientConfigSchema.clone();

export type OllamaConfig = z.infer<typeof OllamaConfigSchema>;

/**
 * Ollama API Client
 * Implements the complete Ollama API with support for streaming, chat, embeddings, and model management
 */
export class OllamaClient implements OllamaTypes.OllamaClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;
  private readonly logger: Logger;

  constructor(config: WorkerConfig) {
    this.logger = new Logger('OllamaClient');

    const {
      baseUrl,
      timeout,
      headers
    } = OllamaConfigSchema.parse(config);
  

    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.headers = {
      'Content-Type': 'application/json',
      ...headers
    };

    this.logger.debug(`Initialized (baseUrl=${this.baseUrl}, timeout=${this.timeout})`);
  }

  /**
   * Make HTTP request to Ollama API
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
          const errorBody = await response.json() as OllamaTypes.OllamaError;
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
    options: RequestInit = {}
  ): OllamaTypes.StreamingResponse<T> {
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
          const errorBody = await response.json() as OllamaTypes.OllamaError;
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
                console.warn('Failed to parse streaming response line:', line, error);
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            yield JSON.parse(buffer) as T;
          } catch (error) {
            console.warn('Failed to parse final streaming response:', buffer, error);
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

  /**
   * Generate a completion for a given prompt with a provided model.
   *
   * This method generates a single response for the provided prompt. The response includes
   * the generated text along with metadata about the generation process including timing
   * and token counts.
   *
   * @param request - The generation request configuration
   * @param request.model - (required) The model name to use for generation
   * @param request.prompt - The prompt to generate a response for
   * @param request.suffix - The text after the model response (for code completion)
   * @param request.images - Base64-encoded images for multimodal models (e.g., llava)
   * @param request.think - For thinking models, should the model think before responding?
   * @param request.format - Response format: 'json' or a JSON schema for structured outputs
   * @param request.options - Additional model parameters (temperature, top_k, etc.)
   * @param request.system - System message to override what's defined in the Modelfile
   * @param request.template - Prompt template to override what's defined in the Modelfile
   * @param request.raw - If true, no formatting will be applied to the prompt
   * @param request.keep_alive - How long to keep the model loaded (default: '5m')
   * @param request.context - (deprecated) Context from previous request for conversational memory
   *
   * @returns Promise resolving to the generation response with text and metadata
   *
   * @example
   * ```typescript
   * const response = await client.generate({
   *   model: 'llama3.2',
   *   prompt: 'Why is the sky blue?'
   * });
   * console.log(response.response); // Generated text
   * ```
   *
   * @example JSON mode
   * ```typescript
   * const response = await client.generate({
   *   model: 'llama3.2',
   *   prompt: 'What color is the sky? Respond using JSON',
   *   format: 'json'
   * });
   * ```
   *
   * @example Structured outputs
   * ```typescript
   * const response = await client.generate({
   *   model: 'llama3.1:8b',
   *   prompt: 'Ollama is 22 years old. Respond using JSON',
   *   format: {
   *     type: 'object',
   *     properties: {
   *       age: { type: 'integer' },
   *       available: { type: 'boolean' }
   *     },
   *     required: ['age', 'available']
   *   }
   * });
   * ```
   */
  async generate(request: OllamaTypes.GenerateRequest): Promise<OllamaTypes.GenerateResponse> {
    const requestBody = { ...request, stream: false };
    return this.request<OllamaTypes.GenerateResponse>('/api/generate', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  }

  /**
   * Generate a completion with streaming response.
   *
   * This method returns an async iterable that yields partial responses as they are generated.
   * The final response includes additional metadata about the generation process.
   *
   * @param request - The generation request configuration with stream: true
   * @returns AsyncIterable yielding partial responses as they are generated
   *
   * @example
   * ```typescript
   * for await (const chunk of client.generateStream({
   *   model: 'llama3.2',
   *   prompt: 'Tell me a story',
   *   stream: true
   * })) {
   *   if (!chunk.done) {
   *     process.stdout.write(chunk.response);
   *   } else {
   *     console.log('\nGeneration complete!');
   *     console.log(`Tokens: ${chunk.eval_count}`);
   *   }
   * }
   * ```
   */
  generateStream(request: OllamaTypes.GenerateRequest & { stream: true }): OllamaTypes.StreamingResponse<OllamaTypes.GenerateResponse> {
    const requestBody = { ...request, stream: true };
    return this.requestStream<OllamaTypes.GenerateResponse>('/api/generate', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  }

  /**
   * Generate the next message in a chat conversation.
   *
   * This method generates a response based on a conversation history. It supports
   * multi-turn conversations, tool calling, multimodal inputs, and structured outputs.
   *
   * @param request - The chat request configuration
   * @param request.model - (required) The model name to use for the chat
   * @param request.messages - Array of messages representing the conversation history
   * @param request.tools - List of tools available for the model to use (function calling)
   * @param request.think - For thinking models, should the model think before responding?
   * @param request.format - Response format: 'json' or a JSON schema for structured outputs
   * @param request.options - Additional model parameters (temperature, top_k, etc.)
   * @param request.keep_alive - How long to keep the model loaded (default: '5m')
   *
   * @returns Promise resolving to the chat response with the assistant's message
   *
   * @example Basic chat
   * ```typescript
   * const response = await client.chat({
   *   model: 'llama3.2',
   *   messages: [
   *     { role: 'user', content: 'Hello!' }
   *   ]
   * });
   * console.log(response.message.content);
   * ```
   *
   * @example Multi-turn conversation
   * ```typescript
   * const response = await client.chat({
   *   model: 'llama3.2',
   *   messages: [
   *     { role: 'user', content: 'Why is the sky blue?' },
   *     { role: 'assistant', content: 'Due to Rayleigh scattering.' },
   *     { role: 'user', content: 'How is that different than Mie scattering?' }
   *   ]
   * });
   * ```
   *
   * @example With images (multimodal)
   * ```typescript
   * const response = await client.chat({
   *   model: 'llava',
   *   messages: [
   *     {
   *       role: 'user',
   *       content: 'What is in this image?',
   *       images: ['base64-encoded-image-data']
   *     }
   *   ]
   * });
   * ```
   *
   * @example Tool calling
   * ```typescript
   * const response = await client.chat({
   *   model: 'llama3.2',
   *   messages: [
   *     { role: 'user', content: 'What is the weather in Tokyo?' }
   *   ],
   *   tools: [
   *     {
   *       type: 'function',
   *       function: {
   *         name: 'get_weather',
   *         description: 'Get the weather in a given city',
   *         parameters: {
   *           type: 'object',
   *           properties: {
   *             city: { type: 'string', description: 'The city name' }
   *           },
   *           required: ['city']
   *         }
   *       }
   *     }
   *   ]
   * });
   * ```
   */
  async chat(request: OllamaTypes.ChatRequest): Promise<OllamaTypes.ChatResponse> {
    const requestBody = { ...request, stream: false };
    return this.request<OllamaTypes.ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  }

  /**
   * Generate a chat response with streaming.
   *
   * This method returns an async iterable that yields partial chat responses as they
   * are generated. Useful for real-time chat interfaces.
   *
   * @param request - The chat request configuration with stream: true
   * @returns AsyncIterable yielding partial chat responses as they are generated
   *
   * @example
   * ```typescript
   * for await (const chunk of client.chatStream({
   *   model: 'llama3.2',
   *   messages: [{ role: 'user', content: 'Tell me a joke' }],
   *   stream: true
   * })) {
   *   if (!chunk.done) {
   *     process.stdout.write(chunk.message.content);
   *   } else {
   *     console.log('\nChat complete!');
   *   }
   * }
   * ```
   */
  chatStream(request: OllamaTypes.ChatRequest & { stream: true }): OllamaTypes.StreamingResponse<OllamaTypes.ChatResponse> {
    const requestBody = { ...request, stream: true };
    return this.requestStream<OllamaTypes.ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  }

  /**
   * Create a model from another model, a safetensors directory, or a GGUF file.
   *
   * This method allows you to create custom models by deriving from existing models
   * or importing from external model files. You can customize the system prompt,
   * parameters, and other model properties.
   *
   * @param request - The model creation request
   * @param request.model - (required) Name of the model to create
   * @param request.from - Name of an existing model to create the new model from
   * @param request.files - Dictionary of file names to SHA256 digests of blobs
   * @param request.adapters - Dictionary of LORA adapter files to SHA256 digests
   * @param request.template - Prompt template for the model
   * @param request.license - License or licenses for the model
   * @param request.system - System prompt for the model
   * @param request.parameters - Dictionary of model parameters
   * @param request.messages - List of message objects for conversation setup
   * @param request.quantize - Quantization type ('q4_K_M', 'q4_K_S', 'q8_0')
   *
   * @returns Promise resolving to creation status updates
   *
   * @example Create from existing model
   * ```typescript
   * const response = await client.create({
   *   model: 'mario',
   *   from: 'llama3.2',
   *   system: 'You are Mario from Super Mario Bros.'
   * });
   * ```
   *
   * @example Quantize a model
   * ```typescript
   * const response = await client.create({
   *   model: 'llama3.2:quantized',
   *   from: 'llama3.2:3b-instruct-fp16',
   *   quantize: 'q4_K_M'
   * });
   * ```
   */
  async create(request: OllamaTypes.CreateModelRequest): Promise<OllamaTypes.CreateModelResponse> {
    const requestBody = { ...request, stream: false };
    return this.request<OllamaTypes.CreateModelResponse>('/api/create', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  }

  /**
   * Create a model with streaming progress updates.
   *
   * @param request - The model creation request with stream: true
   * @returns AsyncIterable yielding creation progress updates
   *
   * @example
   * ```typescript
   * for await (const update of client.createStream({
   *   model: 'custom-model',
   *   from: 'llama3.2',
   *   stream: true
   * })) {
   *   console.log(update.status);
   * }
   * ```
   */
  createStream(request: OllamaTypes.CreateModelRequest & { stream: true }): OllamaTypes.StreamingResponse<OllamaTypes.CreateModelResponse> {
    const requestBody = { ...request, stream: true };
    return this.requestStream<OllamaTypes.CreateModelResponse>('/api/create', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  }

  /**
   * List models that are available locally.
   *
   * Returns information about all models stored locally including their names,
   * sizes, modification dates, and technical details.
   *
   * @returns Promise resolving to list of available models
   *
   * @example
   * ```typescript
   * const models = await client.list();
   * models.models.forEach(model => {
   *   console.log(`${model.name}: ${model.details.parameter_size}`);
   * });
   * ```
   */
  async list(): Promise<OllamaTypes.ListModelsResponse> {
    return this.request<OllamaTypes.ListModelsResponse>('/api/tags', {
      method: 'GET'
    });
  }

  /**
   * Show detailed information about a model.
   *
   * Returns comprehensive information about a model including its Modelfile,
   * parameters, template, license, system prompt, and technical details.
   *
   * @param request - The show model request
   * @param request.model - (required) Name of the model to show information for
   * @param request.verbose - If true, returns full data for verbose response fields
   *
   * @returns Promise resolving to detailed model information
   *
   * @example
   * ```typescript
   * const info = await client.show({ model: 'llama3.2' });
   * console.log(info.details.parameter_size);
   * console.log(info.modelfile);
   * ```
   */
  async show(request: OllamaTypes.ShowModelRequest): Promise<OllamaTypes.ShowModelResponse> {
    return this.request<OllamaTypes.ShowModelResponse>('/api/show', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Copy a model to create a model with another name.
   *
   * Creates a duplicate of an existing model with a new name. This is useful
   * for creating backups or variations of models.
   *
   * @param request - The copy model request
   * @param request.source - (required) Name of the source model to copy
   * @param request.destination - (required) Name for the new copied model
   *
   * @returns Promise that resolves when the copy is complete
   *
   * @example
   * ```typescript
   * await client.copy({
   *   source: 'llama3.2',
   *   destination: 'llama3-backup'
   * });
   * ```
   */
  async copy(request: OllamaTypes.CopyModelRequest): Promise<void> {
    await this.request<void>('/api/copy', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Delete a model and its data.
   *
   * Permanently removes a model from local storage. This action cannot be undone.
   *
   * @param request - The delete model request
   * @param request.model - (required) Name of the model to delete
   *
   * @returns Promise that resolves when the model is deleted
   *
   * @example
   * ```typescript
   * await client.delete({ model: 'llama3:13b' });
   * ```
   */
  async delete(request: OllamaTypes.DeleteModelRequest): Promise<void> {
    await this.request<void>('/api/delete', {
      method: 'DELETE',
      body: JSON.stringify(request)
    });
  }

  /**
   * Download a model from the Ollama library.
   *
   * Downloads a model from the official Ollama library or a custom registry.
   * Cancelled pulls are resumed from where they left off, and multiple calls
   * will share the same download progress.
   *
   * @param request - The pull model request
   * @param request.model - (required) Name of the model to pull
   * @param request.insecure - Allow insecure connections (development only)
   *
   * @returns Promise resolving to pull completion status
   *
   * @example
   * ```typescript
   * const result = await client.pull({ model: 'llama3.2' });
   * console.log(result.status); // 'success'
   * ```
   */
  async pull(request: OllamaTypes.PullModelRequest): Promise<OllamaTypes.PullModelResponse> {
    const requestBody = { ...request, stream: false };
    return this.request<OllamaTypes.PullModelResponse>('/api/pull', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  }

  /**
   * Download a model with streaming progress updates.
   *
   * @param request - The pull model request with stream: true
   * @returns AsyncIterable yielding download progress updates
   *
   * @example
   * ```typescript
   * for await (const progress of client.pullStream({
   *   model: 'llama3.2',
   *   stream: true
   * })) {
   *   if (progress.total && progress.completed) {
   *     const percent = (progress.completed / progress.total * 100).toFixed(1);
   *     console.log(`Download progress: ${percent}%`);
   *   }
   * }
   * ```
   */
  pullStream(request: OllamaTypes.PullModelRequest & { stream: true }): OllamaTypes.StreamingResponse<OllamaTypes.PullModelResponse> {
    const requestBody = { ...request, stream: true };
    return this.requestStream<OllamaTypes.PullModelResponse>('/api/pull', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  }

  /**
   * Upload a model to a model library.
   *
   * Uploads a local model to the Ollama library or a custom registry.
   * Requires registering for ollama.ai and adding a public key first.
   *
   * @param request - The push model request
   * @param request.model - (required) Name of the model to push (format: namespace/model:tag)
   * @param request.insecure - Allow insecure connections (development only)
   *
   * @returns Promise resolving to push completion status
   *
   * @example
   * ```typescript
   * const result = await client.push({
   *   model: 'myusername/custom-model:latest'
   * });
   * console.log(result.status); // 'success'
   * ```
   */
  async push(request: OllamaTypes.PushModelRequest): Promise<OllamaTypes.PushModelResponse> {
    const requestBody = { ...request, stream: false };
    return this.request<OllamaTypes.PushModelResponse>('/api/push', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  }

  /**
   * Upload a model with streaming progress updates.
   *
   * @param request - The push model request with stream: true
   * @returns AsyncIterable yielding upload progress updates
   *
   * @example
   * ```typescript
   * for await (const progress of client.pushStream({
   *   model: 'myusername/custom-model:latest',
   *   stream: true
   * })) {
   *   console.log(`Upload status: ${progress.status}`);
   * }
   * ```
   */
  pushStream(request: OllamaTypes.PushModelRequest & { stream: true }): OllamaTypes.StreamingResponse<OllamaTypes.PushModelResponse> {
    const requestBody = { ...request, stream: true };
    return this.requestStream<OllamaTypes.PushModelResponse>('/api/push', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  }

  /**
   * Generate embeddings from a model.
   *
   * Creates vector embeddings for the provided text input(s). Embeddings are
   * numerical representations of text that can be used for semantic search,
   * similarity comparisons, and other machine learning tasks.
   *
   * @param request - The embedding request
   * @param request.model - (required) Name of the model to generate embeddings from
   * @param request.input - Text or array of texts to generate embeddings for
   * @param request.truncate - Truncate input to fit context length (default: true)
   * @param request.options - Additional model parameters
   * @param request.keep_alive - How long to keep the model loaded (default: '5m')
   *
   * @returns Promise resolving to embeddings and metadata
   *
   * @example Single input
   * ```typescript
   * const response = await client.embed({
   *   model: 'all-minilm',
   *   input: 'Why is the sky blue?'
   * });
   * console.log(response.embeddings[0]); // Array of numbers
   * ```
   *
   * @example Multiple inputs
   * ```typescript
   * const response = await client.embed({
   *   model: 'all-minilm',
   *   input: ['Why is the sky blue?', 'Why is grass green?']
   * });
   * console.log(response.embeddings.length); // 2
   * ```
   */
  async embed(request: OllamaTypes.EmbedRequest): Promise<OllamaTypes.EmbedResponse> {
    return this.request<OllamaTypes.EmbedResponse>('/api/embed', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Generate embeddings using the legacy API endpoint.
   *
   * @deprecated Use the `embed` method instead. This endpoint is maintained for backwards compatibility.
   *
   * @param request - The legacy embedding request
   * @param request.model - (required) Name of the model to generate embeddings from
   * @param request.prompt - Text to generate embeddings for
   * @param request.options - Additional model parameters
   * @param request.keep_alive - How long to keep the model loaded (default: '5m')
   *
   * @returns Promise resolving to embedding vector
   *
   * @example
   * ```typescript
   * const response = await client.embeddings({
   *   model: 'all-minilm',
   *   prompt: 'Here is an article about llamas...'
   * });
   * console.log(response.embedding); // Array of numbers
   * ```
   */
  async embeddings(request: OllamaTypes.EmbeddingsRequest): Promise<OllamaTypes.EmbeddingsResponse> {
    return this.request<OllamaTypes.EmbeddingsResponse>('/api/embeddings', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * List models that are currently loaded into memory.
   *
   * Returns information about models that are currently running and consuming
   * memory/VRAM. This is useful for monitoring resource usage and managing
   * which models are active.
   *
   * @returns Promise resolving to list of currently running models
   *
   * @example
   * ```typescript
   * const runningModels = await client.ps();
   * runningModels.models.forEach(model => {
   *   console.log(`${model.name} expires at ${model.expires_at}`);
   *   console.log(`VRAM usage: ${model.size_vram} bytes`);
   * });
   * ```
   */
  async ps(): Promise<OllamaTypes.ListModelsResponse> {
    return this.request<OllamaTypes.ListModelsResponse>('/api/ps', {
      method: 'GET'
    });
  }

  /**
   * Get the Ollama server version.
   *
   * Returns the version information of the Ollama server. Useful for
   * compatibility checks and debugging.
   *
   * @returns Promise resolving to version information
   *
   * @example
   * ```typescript
   * const versionInfo = await client.version();
   * console.log(`Ollama version: ${versionInfo.version}`);
   * ```
   */
  async version(): Promise<OllamaTypes.VersionResponse> {
    return this.request<OllamaTypes.VersionResponse>('/api/version', {
      method: 'GET'
    });
  }

  /**
   * Check if a blob exists on the server.
   *
   * Verifies whether a file blob (Binary Large Object) with the specified
   * SHA256 digest exists on the Ollama server. This is used internally
   * for model creation from external files.
   *
   * @param params - The blob existence check parameters
   * @param params.digest - SHA256 digest of the blob to check
   *
   * @returns Promise resolving to true if the blob exists, false otherwise
   *
   * @example
   * ```typescript
   * const exists = await client.blobExists({
   *   digest: 'sha256:29fdb92e57cf0827ded04ae6461b5931d01fa595843f55d36f5b275a52087dd2'
   * });
   * console.log(exists ? 'Blob exists' : 'Blob not found');
   * ```
   */
  async blobExists(params: OllamaTypes.BlobExistsParams): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/blobs/${params.digest}`, {
        method: 'HEAD',
        headers: this.headers
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Upload a blob to the Ollama server.
   *
   * Uploads a file blob to the server for use in model creation. The blob
   * is identified by its SHA256 digest and can be referenced when creating
   * models from external files.
   *
   * @param params - The blob upload parameters
   * @param params.digest - Expected SHA256 digest of the file
   * @param data - The file data as a Blob or Buffer
   *
   * @returns Promise that resolves when the upload is complete
   *
   * @example
   * ```typescript
   * const fileBuffer = fs.readFileSync('model.gguf');
   * await client.pushBlob({
   *   digest: 'sha256:29fdb92e57cf0827ded04ae6461b5931d01fa595843f55d36f5b275a52087dd2'
   * }, fileBuffer);
   * ```
   */
  async pushBlob(params: OllamaTypes.PushBlobParams, data: Blob | Buffer): Promise<void> {
    const body = data as BodyInit;

    await this.request<void>(`/api/blobs/${params.digest}`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/octet-stream'
      },
      body
    });
  }
}