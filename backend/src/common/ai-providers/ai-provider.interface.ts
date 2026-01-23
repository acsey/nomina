/**
 * AI Provider Interface
 *
 * This interface defines the contract for all AI providers (Anthropic, OpenAI, Gemini).
 * Any new AI provider must implement this interface.
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature (0-1), higher = more creative */
  temperature?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** System prompt/instructions */
  systemPrompt?: string;
}

export interface AICompletionResponse {
  /** The generated text content */
  content: string;
  /** Token usage information */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  /** The model used */
  model: string;
  /** Provider name */
  provider: AIProviderType;
  /** Finish reason */
  finishReason?: 'stop' | 'length' | 'content_filter' | 'error';
  /** Raw response (for debugging) */
  raw?: any;
}

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeout?: number;
}

export type AIProviderType = 'anthropic' | 'openai' | 'gemini';

export interface IAIProvider {
  /** Provider type identifier */
  readonly providerType: AIProviderType;

  /** Check if the provider is configured and ready */
  isConfigured(): boolean;

  /** Generate a completion from a single prompt */
  complete(prompt: string, options?: AICompletionOptions): Promise<AICompletionResponse>;

  /** Generate a completion from a conversation (messages array) */
  chat(messages: AIMessage[], options?: AICompletionOptions): Promise<AICompletionResponse>;

  /** Get available models for this provider */
  getAvailableModels(): string[];

  /** Get the default model for this provider */
  getDefaultModel(): string;

  /** Test the connection to the provider */
  testConnection(): Promise<boolean>;
}

/**
 * Default models for each provider (cost-optimized)
 */
export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  anthropic: 'claude-3-haiku-20240307',      // Most cost-effective Claude model
  openai: 'gpt-4o-mini',                      // Most cost-effective GPT-4 model
  gemini: 'gemini-1.5-flash',                 // Most cost-effective Gemini model
};

/**
 * Available models for each provider
 */
export const AVAILABLE_MODELS: Record<AIProviderType, string[]> = {
  anthropic: [
    'claude-3-haiku-20240307',    // Fast, cheap
    'claude-3-sonnet-20240229',   // Balanced
    'claude-sonnet-4-20250514',   // Latest Sonnet
    'claude-3-opus-20240229',     // Most capable
  ],
  openai: [
    'gpt-4o-mini',                // Fast, cheap
    'gpt-4o',                     // Balanced
    'gpt-4-turbo',                // Fast, capable
    'gpt-4',                      // Original GPT-4
  ],
  gemini: [
    'gemini-1.5-flash',           // Fast, cheap
    'gemini-1.5-pro',             // Balanced
    'gemini-1.0-pro',             // Stable
  ],
};
