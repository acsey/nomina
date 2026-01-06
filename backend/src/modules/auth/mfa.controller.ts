/**
 * P0.1 - MFA Controller
 *
 * Endpoints para gestionar la autenticación de dos factores (TOTP)
 */

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import {
  VerifyMfaDto,
  MfaSetupResponseDto,
  MfaStatusResponseDto,
} from './dto/mfa.dto';

@ApiTags('auth/mfa')
@Controller('auth/mfa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  /**
   * Obtener estado de MFA para el usuario actual
   */
  @Get('status')
  @ApiOperation({ summary: 'Obtener estado de MFA' })
  @ApiResponse({ status: 200, type: MfaStatusResponseDto })
  async getStatus(@CurrentUser('sub') userId: string): Promise<MfaStatusResponseDto> {
    return this.mfaService.getMfaStatus(userId);
  }

  /**
   * Iniciar configuración de MFA
   * Genera un nuevo secreto TOTP y códigos de respaldo
   */
  @Post('setup')
  @ApiOperation({ summary: 'Iniciar configuración de MFA' })
  @ApiResponse({ status: 200, type: MfaSetupResponseDto })
  @Throttle({ short: { ttl: 60000, limit: 3 } }) // Limitar intentos de setup
  async setup(@CurrentUser('sub') userId: string): Promise<MfaSetupResponseDto> {
    return this.mfaService.setupMfa(userId);
  }

  /**
   * Verificar y activar MFA
   * El usuario debe proporcionar un código válido para completar la configuración
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar código y activar MFA' })
  @ApiResponse({ status: 200, description: 'MFA activado correctamente' })
  @Throttle({ short: { ttl: 60000, limit: 5 } }) // Limitar intentos de verificación
  async verify(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyMfaDto,
  ): Promise<{ success: boolean }> {
    return this.mfaService.verifyAndEnableMfa(userId, dto.code);
  }

  /**
   * Deshabilitar MFA
   * Requiere un código válido para confirmar
   */
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deshabilitar MFA' })
  @ApiResponse({ status: 200, description: 'MFA deshabilitado correctamente' })
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  async disable(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyMfaDto,
  ): Promise<{ success: boolean }> {
    return this.mfaService.disableMfa(userId, dto.code);
  }

  /**
   * Regenerar códigos de respaldo
   * Los códigos anteriores serán invalidados
   */
  @Post('backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerar códigos de respaldo' })
  @ApiResponse({ status: 200, description: 'Nuevos códigos generados' })
  @Throttle({ short: { ttl: 60000, limit: 2 } })
  async regenerateBackupCodes(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyMfaDto,
  ): Promise<{ backupCodes: string[] }> {
    return this.mfaService.regenerateBackupCodes(userId, dto.code);
  }
}
