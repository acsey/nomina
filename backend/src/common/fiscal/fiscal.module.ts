import { Module, Global } from '@nestjs/common';
import { FiscalValuesService } from './fiscal-values.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [FiscalValuesService],
  exports: [FiscalValuesService],
})
export class FiscalModule {}
