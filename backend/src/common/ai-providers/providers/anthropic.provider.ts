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
 * Anthropic Claude AI Provider
 *
 * Implements the IAIProvider interface for Anthropic's Claude models.
 * Supports Claude 3 Haiku, Sonnet, and Opus models.
 *
 * @see https://docs.anthropic.com/claude/reference/messages_post
 */
export class AnthropicProvider implements IAIProvider {
  readonly providerType: AIProviderType = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || '';
    this.model = config.model || DEFAULT_MODELS.anthropic;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.timeout = config.timeout || 30000;
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('sk-ant-');
  }

  getAvailableModels(): string[] {
    return AVAILABLE_MODELS.anthropic;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.anthropic;
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await this.complete('Hi', { maxTokens: 10 });
      return !!response.content;
    } catch (error) {
      this.logger.error(`Anthropic connection test failed: ${error.message}`);
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
      throw new Error('Anthropic provider is not configured. Set ANTHROPIC_API_KEY.');
    }

    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const requestBody: any = {
      model: this.model,
      max_tokens: options?.maxTokens || 1024,
      messages: chatMessages,
    };

    if (systemMessage || options?.systemPrompt) {
      requestBody.system = options?.systemPrompt || systemMessage?.content;
    }

    if (options?.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }

    if (options?.stopSequences) {
      requestBody.stop_sequences = options.stopSequences;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();

      return {
        content: data.content[0]?.text || '',
        usage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
          totalTokens:
            (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
        model: data.model,
        provider: this.providerType,
        finishReason: this.mapStopReason(data.stop_reason),
        raw: data,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Anthropic API request timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  private mapStopReason(
    reason: string,
  ): 'stop' | 'length' | 'content_filter' | 'error' {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return 'stop';
    }
  }
}
