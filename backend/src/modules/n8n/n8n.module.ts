import { Module } from '@nestjs/common';
import { N8nService } from './n8n.service';
import { N8nController } from './n8n.controller';
import { ChatbotService } from './chatbot.service';

@Module({
  controllers: [N8nController],
  providers: [N8nService, ChatbotService],
  exports: [N8nService, ChatbotService],
})
export class N8nModule {}
