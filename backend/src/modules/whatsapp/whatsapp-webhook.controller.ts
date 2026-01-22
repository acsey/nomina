import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  Res,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { WhatsAppMessageProcessor } from './whatsapp-message.processor';
import { TwilioWebhookDto, MetaWebhookDto } from './dto';

/**
 * Webhook Controller for WhatsApp messages
 * These endpoints are PUBLIC (no authentication) as they receive webhooks from providers
 */
@ApiTags('WhatsApp Webhooks')
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(private readonly messageProcessor: WhatsAppMessageProcessor) {}

  // =============================================
  // Twilio Webhook
  // =============================================

  @Post('twilio')
  @ApiOperation({ summary: 'Webhook para mensajes de Twilio WhatsApp' })
  async twilioWebhook(
    @Body() body: TwilioWebhookDto,
    @Headers('x-twilio-signature') signature: string,
    @Res() res: Response
  ) {
    this.logger.log(`Twilio webhook received from ${body.From}`);

    try {
      // TODO: Verificar firma de Twilio para seguridad
      // const isValid = await this.verifyTwilioSignature(signature, body);

      await this.messageProcessor.processTwilioMessage(body);

      // Twilio espera un TwiML response o vacío
      res.type('text/xml');
      res.status(HttpStatus.OK).send('<Response></Response>');
    } catch (error: any) {
      this.logger.error(`Error processing Twilio webhook: ${error.message}`);
      res.status(HttpStatus.OK).send('<Response></Response>');
    }
  }

  // =============================================
  // Meta (WhatsApp Business API) Webhook
  // =============================================

  @Get('meta')
  @ApiOperation({ summary: 'Verificación de webhook de Meta' })
  metaVerify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response
  ) {
    this.logger.log('Meta webhook verification request');

    // TODO: Obtener token de verificación de configuración
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'nomina_verify_token';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      this.logger.log('Meta webhook verified successfully');
      res.status(HttpStatus.OK).send(challenge);
    } else {
      this.logger.warn('Meta webhook verification failed');
      res.status(HttpStatus.FORBIDDEN).send('Verification failed');
    }
  }

  @Post('meta')
  @ApiOperation({ summary: 'Webhook para mensajes de Meta WhatsApp Business API' })
  async metaWebhook(@Body() body: MetaWebhookDto, @Res() res: Response) {
    this.logger.log('Meta webhook received');

    try {
      await this.messageProcessor.processMetaMessage(body);
      res.status(HttpStatus.OK).send('EVENT_RECEIVED');
    } catch (error: any) {
      this.logger.error(`Error processing Meta webhook: ${error.message}`);
      res.status(HttpStatus.OK).send('EVENT_RECEIVED');
    }
  }

  // =============================================
  // n8n Webhook (para integraciones personalizadas)
  // =============================================

  @Post('n8n')
  @ApiOperation({ summary: 'Webhook genérico para n8n' })
  async n8nWebhook(
    @Body() body: any,
    @Headers('x-n8n-signature') signature: string,
    @Res() res: Response
  ) {
    this.logger.log('n8n webhook received');

    try {
      // Procesar según el tipo de evento
      const result = await this.messageProcessor.processN8nWebhook(body);

      res.status(HttpStatus.OK).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      this.logger.error(`Error processing n8n webhook: ${error.message}`);
      res.status(HttpStatus.OK).json({
        success: false,
        error: error.message,
      });
    }
  }

  // =============================================
  // Test Endpoint (solo para desarrollo)
  // =============================================

  @Post('test')
  @ApiExcludeEndpoint()
  async testWebhook(@Body() body: any, @Res() res: Response) {
    if (process.env.NODE_ENV === 'production') {
      res.status(HttpStatus.NOT_FOUND).send('Not Found');
      return;
    }

    this.logger.log('Test webhook received');
    this.logger.debug(JSON.stringify(body, null, 2));

    try {
      const result = await this.messageProcessor.processTestMessage(body);
      res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: error.message,
      });
    }
  }
}
