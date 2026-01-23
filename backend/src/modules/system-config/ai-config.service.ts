import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  AIProviderService,
  AIProviderType,
  AVAILABLE_MODELS,
  DEFAULT_MODELS,
} from '../../common/ai-providers';

interface ProviderConfig {
  apiKey: string;
  model: string;
  isConfigured: boolean;
}

interface AIConfigResponse {
  defaultProvider: string | null;
  providers: Record<string, ProviderConfig>;
}

const VALID_PROVIDERS: AIProviderType[] = ['anthropic', 'openai', 'gemini'];

const PROVIDER_CONFIG_KEYS = {
  anthropic: {
    apiKey: 'AI_ANTHROPIC_API_KEY',
    model: 'AI_ANTHROPIC_MODEL',
  },
  openai: {
    apiKey: 'AI_OPENAI_API_KEY',
    model: 'AI_OPENAI_MODEL',
  },
  gemini: {
    apiKey: 'AI_GOOGLE_API_KEY',
    model: 'AI_GEMINI_MODEL',
  },
};

@Injectable()
export class AIConfigService {
  private readonly logger = new Logger(AIConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AIProviderService,
  ) {}

  /**
   * Get current AI configuration
   */
  async getConfig(): Promise<AIConfigResponse> {
    const configs = await this.prisma.systemConfig.findMany({
      where: {
        key: {
          startsWith: 'AI_',
        },
      },
    });

    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    const defaultProvider = configMap.get('AI_DEFAULT_PROVIDER') || null;

    const providers: Record<string, ProviderConfig> = {};

    for (const provider of VALID_PROVIDERS) {
      const keys = PROVIDER_CONFIG_KEYS[provider];
      const apiKey = configMap.get(keys.apiKey) || '';
      const model = configMap.get(keys.model) || DEFAULT_MODELS[provider];

      providers[provider] = {
        apiKey: this.maskApiKey(apiKey),
        model,
        isConfigured: !!apiKey && apiKey.length > 10,
      };
    }

    return {
      defaultProvider,
      providers,
    };
  }

  /**
   * Get AI providers status from the AIProviderService
   */
  async getStatus() {
    return this.aiProvider.getStatus();
  }

  /**
   * Update provider configuration
   */
  async updateProvider(
    provider: string,
    apiKey: string,
    model: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!VALID_PROVIDERS.includes(provider as AIProviderType)) {
      throw new BadRequestException(`Invalid provider: ${provider}`);
    }

    const keys = PROVIDER_CONFIG_KEYS[provider as AIProviderType];

    // Validate API key format
    if (!this.validateApiKeyFormat(provider as AIProviderType, apiKey)) {
      throw new BadRequestException(`Invalid API key format for ${provider}`);
    }

    // Validate model
    const validModels = AVAILABLE_MODELS[provider as AIProviderType];
    if (!validModels.includes(model)) {
      throw new BadRequestException(
        `Invalid model: ${model}. Valid models: ${validModels.join(', ')}`,
      );
    }

    // Save API key
    await this.upsertConfig(keys.apiKey, apiKey, `${provider} API Key`, 'ai');

    // Save model
    await this.upsertConfig(keys.model, model, `${provider} Model`, 'ai');

    // Update environment variables for immediate effect
    this.updateEnvVariable(provider as AIProviderType, apiKey, model);

    this.logger.log(`Updated ${provider} configuration`);

    return {
      success: true,
      message: `${provider} configuration updated successfully`,
    };
  }

  /**
   * Set default AI provider
   */
  async setDefaultProvider(
    provider: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!VALID_PROVIDERS.includes(provider as AIProviderType)) {
      throw new BadRequestException(`Invalid provider: ${provider}`);
    }

    // Check if provider is configured
    const keys = PROVIDER_CONFIG_KEYS[provider as AIProviderType];
    const apiKeyConfig = await this.prisma.systemConfig.findUnique({
      where: { key: keys.apiKey },
    });

    if (!apiKeyConfig?.value) {
      throw new BadRequestException(
        `Cannot set ${provider} as default. Provider is not configured.`,
      );
    }

    await this.upsertConfig(
      'AI_DEFAULT_PROVIDER',
      provider,
      'Default AI Provider',
      'ai',
    );

    // Update environment variable
    process.env.AI_PROVIDER = provider;

    this.logger.log(`Set default AI provider to ${provider}`);

    return {
      success: true,
      message: `Default provider set to ${provider}`,
    };
  }

  /**
   * Test connection to AI provider
   */
  async testConnection(
    provider: string,
  ): Promise<{ success: boolean; message: string; details?: any }> {
    if (!VALID_PROVIDERS.includes(provider as AIProviderType)) {
      throw new BadRequestException(`Invalid provider: ${provider}`);
    }

    try {
      // Get API key from database
      const keys = PROVIDER_CONFIG_KEYS[provider as AIProviderType];
      const apiKeyConfig = await this.prisma.systemConfig.findUnique({
        where: { key: keys.apiKey },
      });

      if (!apiKeyConfig?.value) {
        return {
          success: false,
          message: `${provider} is not configured. Please add an API key first.`,
        };
      }

      // Test connection using the AIProviderService
      const isAvailable = this.aiProvider.isProviderAvailable(
        provider as AIProviderType,
      );

      if (!isAvailable) {
        return {
          success: false,
          message: `${provider} provider is not available. Check your API key.`,
        };
      }

      // Try to make a simple completion
      const response = await this.aiProvider.complete(
        'Hello! Please respond with just "OK" to confirm the connection works.',
        { maxTokens: 10 },
        provider as AIProviderType,
      );

      return {
        success: true,
        message: `Connection to ${provider} successful!`,
        details: {
          model: response.model,
          provider: response.provider,
          tokensUsed: response.usage?.totalTokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Error testing ${provider} connection: ${error.message}`);
      return {
        success: false,
        message: `Failed to connect to ${provider}: ${error.message}`,
      };
    }
  }

  /**
   * Get available models for a provider
   */
  getAvailableModels(provider: string): {
    provider: string;
    models: { id: string; name: string; isDefault: boolean }[];
  } {
    if (!VALID_PROVIDERS.includes(provider as AIProviderType)) {
      throw new BadRequestException(`Invalid provider: ${provider}`);
    }

    const models = AVAILABLE_MODELS[provider as AIProviderType];
    const defaultModel = DEFAULT_MODELS[provider as AIProviderType];

    return {
      provider,
      models: models.map((m) => ({
        id: m,
        name: this.formatModelName(m),
        isDefault: m === defaultModel,
      })),
    };
  }

  // Private helper methods

  private async upsertConfig(
    key: string,
    value: string,
    description: string,
    category: string,
  ): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: {
        key,
        value,
        description,
        category,
        dataType: 'string',
        isPublic: false,
      },
    });
  }

  private maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 10) return '';
    return apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
  }

  private validateApiKeyFormat(provider: AIProviderType, apiKey: string): boolean {
    if (!apiKey || apiKey.length < 20) return false;

    switch (provider) {
      case 'anthropic':
        return apiKey.startsWith('sk-ant-');
      case 'openai':
        return apiKey.startsWith('sk-');
      case 'gemini':
        return apiKey.startsWith('AIza') || apiKey.length > 30;
      default:
        return false;
    }
  }

  private updateEnvVariable(
    provider: AIProviderType,
    apiKey: string,
    model: string,
  ): void {
    switch (provider) {
      case 'anthropic':
        process.env.ANTHROPIC_API_KEY = apiKey;
        process.env.ANTHROPIC_MODEL = model;
        break;
      case 'openai':
        process.env.OPENAI_API_KEY = apiKey;
        process.env.OPENAI_MODEL = model;
        break;
      case 'gemini':
        process.env.GOOGLE_AI_API_KEY = apiKey;
        process.env.GEMINI_MODEL = model;
        break;
    }
  }

  private formatModelName(modelId: string): string {
    const nameMap: Record<string, string> = {
      'claude-3-haiku-20240307': 'Claude 3 Haiku',
      'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
      'claude-sonnet-4-20250514': 'Claude Sonnet 4',
      'claude-3-opus-20240229': 'Claude 3 Opus',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4o': 'GPT-4o',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4': 'GPT-4',
      'gemini-1.5-flash': 'Gemini 1.5 Flash',
      'gemini-1.5-pro': 'Gemini 1.5 Pro',
      'gemini-1.0-pro': 'Gemini 1.0 Pro',
    };
    return nameMap[modelId] || modelId;
  }
}
