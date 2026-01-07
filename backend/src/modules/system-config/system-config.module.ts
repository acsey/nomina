import { Module } from '@nestjs/common';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SecurityModule } from '@/common/security/security.module';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [SystemConfigController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
