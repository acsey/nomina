import { Module } from '@nestjs/common';
import { GovernmentService } from './government.service';
import { GovernmentController } from './government.controller';
import { ImssService } from './services/imss.service';
import { IssstService } from './services/issste.service';
import { InfonavitService } from './services/infonavit.service';

@Module({
  controllers: [GovernmentController],
  providers: [GovernmentService, ImssService, IssstService, InfonavitService],
  exports: [GovernmentService],
})
export class GovernmentModule {}
