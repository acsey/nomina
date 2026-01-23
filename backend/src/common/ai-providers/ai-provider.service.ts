import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  IAIProvider,
  AIProviderType,
  AIMessage,
  AICompletionOptions,
  AICompletionResponse,
  DEFAULT_MODELS,
  AVAILABLE_MODELS,
} from './ai-provider.interface';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';

/**
 * AI Provider Factory/Service
 *
 * This service manages multiple AI providers and provides a unified interface
 * for generating AI completions. It supports automatic fallback between providers
 * and allows runtime provider selection.
 *
 * Supported Providers:
 * - Anthropic (Claude) - ANTHROPIC_API_KEY
 * - OpenAI (GPT) - OPENAI_API_KEY
 * - Google Gemini - GOOGLE_AI_API_KEY
 *
 * @example
 * ```typescript
 * // Use default provider
 * const response = await aiService.complete('Hello');
 *
 * // Use specific provider
 * const response = await aiService.complete('Hello', {}, 'openai');
 *
 * // Use chat interface
 * const response = await aiService.chat([
 *   { role: 'system', content: 'You are a helpful assistant' },
 *   { role: 'user', content: 'Hello' }
 * ]);
 * ```
 */
@Injectable()
export class AIProviderService implements OnModuleInit {
  private readonly logger = new Logger(AIProviderService.name);
  private providers: Map<AIProviderType, IAIProvider> = new Map();
  private defaultProvider: AIProviderType | null = null;

  async onModuleInit() {
    this.initializeProviders();
    this.logProviderStatus();
  }

  /**
   * Initialize all configured AI providers
   */
  private initializeProviders(): void {
    // Initialize Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODELS.anthropic,
      });
      if (anthropic.isConfigured()) {
        this.providers.set('anthropic', anthropic);
      }
    }

    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || DEFAULT_MODELS.openai,
      });
      if (openai.isConfigured()) {
        this.providers.set('openai', openai);
      }
    }

    // Initialize Gemini
    if (process.env.GOOGLE_AI_API_KEY) {
      const gemini = new GeminiProvider({
        apiKey: process.env.GOOGLE_AI_API_KEY,
        model: process.env.GEMINI_MODEL || DEFAULT_MODELS.gemini,
      });
      if (gemini.isConfigured()) {
        this.providers.set('gemini', gemini);
      }
    }

    // Set default provider based on AI_PROVIDER env var or first available
    const preferredProvider = process.env.AI_PROVIDER as AIProviderType;
    if (preferredProvider && this.providers.has(preferredProvider)) {
      this.defaultProvider = preferredProvider;
    } else if (this.providers.size > 0) {
      // Priority: anthropic > openai > gemini
      const priority: AIProviderType[] = ['anthropic', 'openai', 'gemini'];
      for (const p of priority) {
        if (this.providers.has(p)) {
          this.defaultProvider = p;
          break;
        }
      }
    }
  }

  /**
   * Log the status of all providers
   */
  private logProviderStatus(): void {
    const configured = Array.from(this.providers.keys());

    if (configured.length === 0) {
      this.logger.warn(
        '⚠️ No AI providers configured. Set at least one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_AI_API_KEY',
      );
    } else {
      this.logger.log(`✅ AI Providers configured: ${configured.join(', ')}`);
      this.logger.log(`📌 Default provider: ${this.defaultProvider}`);
    }
  }

  /**
   * Check if any provider is available
   */
  isAvailable(): boolean {
    return this.providers.size > 0;
  }

  /**
   * Check if a specific provider is available
   */
  isProviderAvailable(provider: AIProviderType): boolean {
    return this.providers.has(provider);
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): AIProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get the default provider type
   */
  getDefaultProvider(): AIProviderType | null {
    return this.defaultProvider;
  }

  /**
   * Get a specific provider instance
   */
  getProvider(type: AIProviderType): IAIProvider | null {
    return this.providers.get(type) || null;
  }

  /**
   * Get available models for a provider
   */
  getAvailableModels(provider?: AIProviderType): string[] {
    const p = provider || this.defaultProvider;
    if (!p) return [];
    return AVAILABLE_MODELS[p] || [];
  }

  /**
   * Generate a completion using the default or specified provider
   */
  async complete(
    prompt: string,
    options?: AICompletionOptions,
    provider?: AIProviderType,
  ): Promise<AICompletionResponse> {
    const selectedProvider = this.selectProvider(provider);
    return selectedProvider.complete(prompt, options);
  }

  /**
   * Generate a chat completion using the default or specified provider
   */
  async chat(
    messages: AIMessage[],
    options?: AICompletionOptions,
    provider?: AIProviderType,
  ): Promise<AICompletionResponse> {
    const selectedProvider = this.selectProvider(provider);
    return selectedProvider.chat(messages, options);
  }

  /**
   * Generate completion with automatic fallback to other providers on failure
   */
  async completeWithFallback(
    prompt: string,
    options?: AICompletionOptions,
    preferredProvider?: AIProviderType,
  ): Promise<AICompletionResponse> {
    const providers = this.getProvidersInOrder(preferredProvider);

    let lastError: Error | null = null;

    for (const providerType of providers) {
      try {
        const provider = this.providers.get(providerType);
        if (!provider) continue;

        this.logger.debug(`Trying provider: ${providerType}`);
        return await provider.complete(prompt, options);
      } catch (error) {
        this.logger.warn(
          `Provider ${providerType} failed: ${error.message}. Trying next...`,
        );
        lastError = error;
      }
    }

    throw new Error(
      `All AI providers failed. Last error: ${lastError?.message || 'Unknown'}`,
    );
  }

  /**
   * Generate chat completion with automatic fallback
   */
  async chatWithFallback(
    messages: AIMessage[],
    options?: AICompletionOptions,
    preferredProvider?: AIProviderType,
  ): Promise<AICompletionResponse> {
    const providers = this.getProvidersInOrder(preferredProvider);

    let lastError: Error | null = null;

    for (const providerType of providers) {
      try {
        const provider = this.providers.get(providerType);
        if (!provider) continue;

        this.logger.debug(`Trying provider: ${providerType}`);
        return await provider.chat(messages, options);
      } catch (error) {
        this.logger.warn(
          `Provider ${providerType} failed: ${error.message}. Trying next...`,
        );
        lastError = error;
      }
    }

    throw new Error(
      `All AI providers failed. Last error: ${lastError?.message || 'Unknown'}`,
    );
  }

  /**
   * Test connection to all configured providers
   */
  async testAllConnections(): Promise<Record<AIProviderType, boolean>> {
    const results: Partial<Record<AIProviderType, boolean>> = {};

    for (const [type, provider] of this.providers) {
      try {
        results[type] = await provider.testConnection();
      } catch (error) {
        results[type] = false;
      }
    }

    return results as Record<AIProviderType, boolean>;
  }

  /**
   * Get provider status information
   */
  getStatus(): {
    available: boolean;
    providers: {
      type: AIProviderType;
      configured: boolean;
      defaultModel: string;
    }[];
    defaultProvider: AIProviderType | null;
  } {
    const allProviders: AIProviderType[] = ['anthropic', 'openai', 'gemini'];

    return {
      available: this.isAvailable(),
      providers: allProviders.map((type) => ({
        type,
        configured: this.providers.has(type),
        defaultModel: DEFAULT_MODELS[type],
      })),
      defaultProvider: this.defaultProvider,
    };
  }

  /**
   * Select the appropriate provider
   */
  private selectProvider(preferred?: AIProviderType): IAIProvider {
    if (preferred && this.providers.has(preferred)) {
      return this.providers.get(preferred)!;
    }

    if (this.defaultProvider && this.providers.has(this.defaultProvider)) {
      return this.providers.get(this.defaultProvider)!;
    }

    throw new Error(
      'No AI provider available. Configure at least one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_AI_API_KEY',
    );
  }

  /**
   * Get providers in fallback order
   */
  private getProvidersInOrder(preferred?: AIProviderType): AIProviderType[] {
    const order: AIProviderType[] = [];

    // Add preferred first
    if (preferred && this.providers.has(preferred)) {
      order.push(preferred);
    }

    // Add default if different from preferred
    if (
      this.defaultProvider &&
      this.defaultProvider !== preferred &&
      this.providers.has(this.defaultProvider)
    ) {
      order.push(this.defaultProvider);
    }

    // Add remaining providers
    const priority: AIProviderType[] = ['anthropic', 'openai', 'gemini'];
    for (const p of priority) {
      if (!order.includes(p) && this.providers.has(p)) {
        order.push(p);
      }
    }

    return order;
  }
}
