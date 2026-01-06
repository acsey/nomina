import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmailService } from './email.service';

@ApiTags('Email')
@ApiBearerAuth()
@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test-connection')
  @Roles('admin')
  @ApiOperation({ summary: 'Probar conexión SMTP (Solo Super Admin)' })
  @ApiResponse({ status: 200, description: 'Resultado de la prueba de conexión' })
  async testConnection() {
    const result = await this.emailService.testConnection();
    return {
      success: result.success,
      message: result.success
        ? 'Conexión SMTP exitosa'
        : `Error de conexión: ${result.error}`,
    };
  }

  @Post('test-send')
  @Roles('admin')
  @ApiOperation({ summary: 'Enviar correo de prueba (Solo Super Admin)' })
  @ApiBody({ schema: { type: 'object', properties: { to: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Resultado del envío de prueba' })
  async testSend(@Body() body: { to: string }) {
    if (!body.to) {
      return {
        success: false,
        message: 'Debes proporcionar una dirección de correo de destino',
      };
    }

    const result = await this.emailService.sendGenericNotification(
      body.to,
      'Correo de Prueba - Sistema de Nómina',
      'Prueba de Configuración SMTP',
      'Este es un correo de prueba para verificar que la configuración SMTP está funcionando correctamente.',
    );

    return {
      success: result.success,
      message: result.success
        ? `Correo enviado correctamente a ${body.to} (ID: ${result.messageId})`
        : `Error al enviar: ${result.error}`,
    };
  }
}
