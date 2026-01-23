import { Module } from '@nestjs/common';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';
import { AIConfigController } from './ai-config.controller';
import { AIConfigService } from './ai-config.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SecurityModule } from '@/common/security/security.module';
import { AIProviderModule } from '@/common/ai-providers';

@Module({
  imports: [PrismaModule, SecurityModule, AIProviderModule],
  controllers: [SystemConfigController, AIConfigController],
  providers: [SystemConfigService, AIConfigService],
  exports: [SystemConfigService, AIConfigService],
})
export class SystemConfigModule {}
