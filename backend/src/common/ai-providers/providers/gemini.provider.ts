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
 * Google Gemini AI Provider
 *
 * Implements the IAIProvider interface for Google's Gemini models.
 * Supports Gemini 1.5 Flash, Gemini 1.5 Pro, and Gemini 1.0 Pro.
 *
 * @see https://ai.google.dev/gemini-api/docs/text-generation
 */
export class GeminiProvider implements IAIProvider {
  readonly providerType: AIProviderType = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || '';
    this.model = config.model || DEFAULT_MODELS.gemini;
    this.baseUrl =
      config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this.timeout = config.timeout || 30000;
  }

  isConfigured(): boolean {
    // Gemini API keys typically start with 'AIza'
    return !!this.apiKey && this.apiKey.length > 20;
  }

  getAvailableModels(): string[] {
    return AVAILABLE_MODELS.gemini;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.gemini;
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await this.complete('Hi', { maxTokens: 10 });
      return !!response.content;
    } catch (error) {
      this.logger.error(`Gemini connection test failed: ${error.message}`);
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
      throw new Error(
        'Gemini provider is not configured. Set GOOGLE_AI_API_KEY.',
      );
    }

    // Build contents array for Gemini API
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Extract system instruction if present
    const systemMessage = messages.find((m) => m.role === 'system');
    const systemInstruction = options?.systemPrompt || systemMessage?.content;

    // Convert messages to Gemini format
    for (const msg of messages) {
      if (msg.role === 'system') continue; // Handled separately

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    const requestBody: any = {
      contents,
      generationConfig: {
        maxOutputTokens: options?.maxTokens || 1024,
      },
    };

    // Add system instruction if present
    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    if (options?.temperature !== undefined) {
      requestBody.generationConfig.temperature = options.temperature;
    }

    if (options?.stopSequences) {
      requestBody.generationConfig.stopSequences = options.stopSequences;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text || '';

      // Gemini provides usage metadata
      const usageMetadata = data.usageMetadata || {};

      return {
        content,
        usage: {
          inputTokens: usageMetadata.promptTokenCount || 0,
          outputTokens: usageMetadata.candidatesTokenCount || 0,
          totalTokens: usageMetadata.totalTokenCount || 0,
        },
        model: this.model,
        provider: this.providerType,
        finishReason: this.mapFinishReason(candidate?.finishReason),
        raw: data,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Gemini API request timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  private mapFinishReason(
    reason: string,
  ): 'stop' | 'length' | 'content_filter' | 'error' {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
