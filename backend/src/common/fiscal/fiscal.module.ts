import { Module, Global } from '@nestjs/common';
import { FiscalValuesService } from './fiscal-values.service';
import { FiscalAuditService } from './fiscal-audit.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [FiscalValuesService, FiscalAuditService],
  exports: [FiscalValuesService, FiscalAuditService],
})
export class FiscalModule {}
