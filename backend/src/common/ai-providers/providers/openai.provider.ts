import {
  IAIProvider,
  AIProviderType,
  AIMessage,
  AICompletionOptions,
  AICompletionResponse,
  AIProviderConfig,
  DEFAULT_MODELS,
  AVAILABLE_MODELS,
} from '../ai-provider.interface';
import { Logger } from '@nestjs/common';

/**
 * OpenAI GPT AI Provider
 *
 * Implements the IAIProvider interface for OpenAI's GPT models.
 * Supports GPT-4, GPT-4 Turbo, GPT-4o, and GPT-4o-mini models.
 *
 * @see https://platform.openai.com/docs/api-reference/chat/create
 */
export class OpenAIProvider implements IAIProvider {
  readonly providerType: AIProviderType = 'openai';
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || '';
    this.model = config.model || DEFAULT_MODELS.openai;
    this.baseUrl = config.baseUrl || 'https://api.openai.com';
    this.timeout = config.timeout || 30000;
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('sk-');
  }

  getAvailableModels(): string[] {
    return AVAILABLE_MODELS.openai;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.openai;
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await this.complete('Hi', { maxTokens: 10 });
      return !!response.content;
    } catch (error) {
      this.logger.error(`OpenAI connection test failed: ${error.message}`);
      return false;
    }
  }

  async complete(
    prompt: string,
    options?: AICompletionOptions,
  ): Promise<AICompletionResponse> {
    const messages: AIMessage[] = [{ role: 'user', content: prompt }];
    return this.chat(messages, options);
  }

  async chat(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): Promise<AICompletionResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI provider is not configured. Set OPENAI_API_KEY.');
    }

    // Build messages array with system prompt if provided
    const chatMessages: Array<{ role: string; content: string }> = [];

    // Add system prompt if provided in options
    if (options?.systemPrompt) {
      chatMessages.push({ role: 'system', content: options.systemPrompt });
    }

    // Add all messages
    for (const msg of messages) {
      chatMessages.push({ role: msg.role, content: msg.content });
    }

    const requestBody: any = {
      model: this.model,
      messages: chatMessages,
      max_tokens: options?.maxTokens || 1024,
    };

    if (options?.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }

    if (options?.stopSequences) {
      requestBody.stop = options.stopSequences;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      return {
        content: choice?.message?.content || '',
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        model: data.model,
        provider: this.providerType,
        finishReason: this.mapFinishReason(choice?.finish_reason),
        raw: data,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`OpenAI API request timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  private mapFinishReason(
    reason: string,
  ): 'stop' | 'length' | 'content_filter' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
