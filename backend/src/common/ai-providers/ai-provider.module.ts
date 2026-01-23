import { Module, Global } from '@nestjs/common';
import { AIProviderService } from './ai-provider.service';

/**
 * AI Provider Module
 *
 * Global module that provides AI capabilities using multiple providers:
 * - Anthropic Claude (ANTHROPIC_API_KEY)
 * - OpenAI GPT (OPENAI_API_KEY)
 * - Google Gemini (GOOGLE_AI_API_KEY)
 *
 * The module automatically configures available providers based on
 * environment variables and provides a unified interface for AI operations.
 *
 * @example
 * ```typescript
 * // Import in your module
 * @Module({
 *   imports: [AIProviderModule],
 * })
 * export class MyModule {}
 *
 * // Use in your service
 * @Injectable()
 * export class MyService {
 *   constructor(private aiProvider: AIProviderService) {}
 *
 *   async generateResponse(prompt: string) {
 *     return this.aiProvider.complete(prompt);
 *   }
 * }
 * ```
 */
@Global()
@Module({
  providers: [AIProviderService],
  exports: [AIProviderService],
})
export class AIProviderModule {}
