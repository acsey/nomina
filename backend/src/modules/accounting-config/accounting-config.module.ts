import { Module } from '@nestjs/common';
import { AccountingConfigController } from './accounting-config.controller';
import { AccountingConfigService } from './accounting-config.service';
import { CompanyConceptController } from './controllers/company-concept.controller';
import { CompanyConceptService } from './services/company-concept.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SecurityModule } from '@/common/security/security.module';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [AccountingConfigController, CompanyConceptController],
  providers: [AccountingConfigService, CompanyConceptService],
  exports: [AccountingConfigService, CompanyConceptService],
})
export class AccountingConfigModule {}
