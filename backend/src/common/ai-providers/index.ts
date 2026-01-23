/**
 * AI Providers Module
 *
 * This module provides a unified interface for multiple AI providers:
 * - Anthropic Claude
 * - OpenAI GPT
 * - Google Gemini
 *
 * Usage:
 * 1. Configure environment variables (at least one required):
 *    - ANTHROPIC_API_KEY for Claude
 *    - OPENAI_API_KEY for GPT
 *    - GOOGLE_AI_API_KEY for Gemini
 *
 * 2. Optionally set default provider:
 *    - AI_PROVIDER=anthropic|openai|gemini
 *
 * 3. Optionally set specific models:
 *    - ANTHROPIC_MODEL=claude-3-haiku-20240307
 *    - OPENAI_MODEL=gpt-4o-mini
 *    - GEMINI_MODEL=gemini-1.5-flash
 *
 * @module ai-providers
 */

// Interfaces
export {
  IAIProvider,
  AIProviderType,
  AIMessage,
  AICompletionOptions,
  AICompletionResponse,
  AIProviderConfig,
  DEFAULT_MODELS,
  AVAILABLE_MODELS,
} from './ai-provider.interface';

// Providers
export { AnthropicProvider } from './providers/anthropic.provider';
export { OpenAIProvider } from './providers/openai.provider';
export { GeminiProvider } from './providers/gemini.provider';

// Service
export { AIProviderService } from './ai-provider.service';

// Module
export { AIProviderModule } from './ai-provider.module';
