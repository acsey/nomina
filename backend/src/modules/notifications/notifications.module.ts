import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SystemConfigModule } from '@/modules/system-config/system-config.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    SystemConfigModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsSchedulerService],
  exports: [NotificationsService, NotificationsSchedulerService],
})
export class NotificationsModule {}
