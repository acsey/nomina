import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { SystemConfigService } from './system-config.service';
import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '@/common/decorators';

class UpdateConfigDto {
  @IsString()
  key: string;

  @IsString()
  value: string;
}

class UpdateMultipleConfigsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateConfigDto)
  configs: UpdateConfigDto[];

  @IsOptional()
  @IsString()
  justification?: string;
}

/**
 * System Configuration Controller
 *
 * IMPORTANT: All endpoints (except /public) require Super Admin access.
 * Super Admin = admin role WITHOUT companyId (admin@sistema.com)
 *
 * Company admins cannot access system-wide configuration.
 */
@ApiTags('system-config')
@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  // Public endpoint - no auth required for public configs
  @Get('public')
  @ApiOperation({ summary: 'Obtener configuraciones públicas del sistema' })
  async getPublicConfigs() {
    return this.systemConfigService.getPublic();
  }

  @Get()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener todas las configuraciones (solo super admin)' })
  async getAllConfigs() {
    return this.systemConfigService.getAll();
  }

  @Get(':key')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener configuración por clave (solo super admin)' })
  async getConfigByKey(@Param('key') key: string) {
    return this.systemConfigService.getByKey(key);
  }

  @Patch(':key')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar configuración (solo super admin)' })
  async updateConfig(
    @Param('key') key: string,
    @Body() body: { value: string; justification?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.systemConfigService.update(key, body.value, userId, body.justification);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar múltiples configuraciones (solo super admin)' })
  async updateMultipleConfigs(
    @Body() body: UpdateMultipleConfigsDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.systemConfigService.updateMultiple(body.configs, userId, body.justification);
  }

  @Get('auth-policies')
  @ApiOperation({ summary: 'Obtener políticas de autenticación (público)' })
  async getAuthPolicies() {
    return this.systemConfigService.getAuthPolicies();
  }

  @Get('azure-ad/validate')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validar configuración de Azure AD (solo super admin)' })
  async validateAzureAdConfig() {
    return this.systemConfigService.validateAzureAdConfig();
  }
}
