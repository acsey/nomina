import { Module } from '@nestjs/common';
import { AccountingConfigController } from './accounting-config.controller';
import { AccountingConfigService } from './accounting-config.service';
import { CompanyConceptController } from './controllers/company-concept.controller';
import { CompanyConceptService } from './services/company-concept.service';
import { FormulaController } from './controllers/formula.controller';
import { FormulaService } from './services/formula.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SecurityModule } from '@/common/security/security.module';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [AccountingConfigController, CompanyConceptController, FormulaController],
  providers: [AccountingConfigService, CompanyConceptService, FormulaService],
  exports: [AccountingConfigService, CompanyConceptService, FormulaService],
})
export class AccountingConfigModule {}
