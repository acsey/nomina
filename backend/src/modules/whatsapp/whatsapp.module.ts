import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { GeofenceService } from './geofence.service';
import { WhatsAppMessageProcessor } from './whatsapp-message.processor';

@Module({
  controllers: [WhatsAppController, WhatsAppWebhookController],
  providers: [WhatsAppService, GeofenceService, WhatsAppMessageProcessor],
  exports: [WhatsAppService, GeofenceService],
})
export class WhatsAppModule {}
