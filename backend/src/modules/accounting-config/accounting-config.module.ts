import { Module } from '@nestjs/common';
import { AccountingConfigController } from './accounting-config.controller';
import { AccountingConfigService } from './accounting-config.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingConfigController],
  providers: [AccountingConfigService],
  exports: [AccountingConfigService],
})
export class AccountingConfigModule {}
