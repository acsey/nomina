import { Module } from '@nestjs/common';
import { CfdiService } from './cfdi.service';
import { CfdiController } from './cfdi.controller';
import { XmlBuilderService } from './services/xml-builder.service';
import { StampingService } from './services/stamping.service';
import { StampingIdempotencyService } from './services/stamping-idempotency.service';

@Module({
  controllers: [CfdiController],
  providers: [
    CfdiService,
    XmlBuilderService,
    StampingService,
    StampingIdempotencyService,
  ],
  exports: [CfdiService, StampingIdempotencyService],
})
export class CfdiModule {}
