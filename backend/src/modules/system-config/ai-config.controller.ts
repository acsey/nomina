import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AIConfigService } from './ai-config.service';

class UpdateProviderDto {
  apiKey: string;
  model: string;
}

class SetDefaultProviderDto {
  provider: string;
}

@ApiTags('AI Configuration')
@Controller('ai-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AIConfigController {
  constructor(private readonly aiConfigService: AIConfigService) {}

  @Get()
  @Roles('SYSTEM_ADMIN', 'admin')
  @ApiOperation({ summary: 'Get AI configuration status' })
  @ApiResponse({ status: 200, description: 'AI configuration retrieved' })
  async getConfig() {
    return this.aiConfigService.getConfig();
  }

  @Get('status')
  @Roles('SYSTEM_ADMIN', 'admin')
  @ApiOperation({ summary: 'Get AI providers status' })
  @ApiResponse({ status: 200, description: 'AI providers status retrieved' })
  async getStatus() {
    return this.aiConfigService.getStatus();
  }

  @Patch('provider/:provider')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Update AI provider configuration' })
  @ApiResponse({ status: 200, description: 'Provider configuration updated' })
  async updateProvider(
    @Param('provider') provider: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.aiConfigService.updateProvider(provider, dto.apiKey, dto.model);
  }

  @Post('default')
  @Roles('SYSTEM_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set default AI provider' })
  @ApiResponse({ status: 200, description: 'Default provider set' })
  async setDefaultProvider(@Body() dto: SetDefaultProviderDto) {
    return this.aiConfigService.setDefaultProvider(dto.provider);
  }

  @Post('test/:provider')
  @Roles('SYSTEM_ADMIN', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test AI provider connection' })
  @ApiResponse({ status: 200, description: 'Connection test completed' })
  async testConnection(@Param('provider') provider: string) {
    return this.aiConfigService.testConnection(provider);
  }

  @Get('models/:provider')
  @Roles('SYSTEM_ADMIN', 'admin')
  @ApiOperation({ summary: 'Get available models for provider' })
  @ApiResponse({ status: 200, description: 'Models list retrieved' })
  async getModels(@Param('provider') provider: string) {
    return this.aiConfigService.getAvailableModels(provider);
  }
}
