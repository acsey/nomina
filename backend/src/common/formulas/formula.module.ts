import { Module, Global } from '@nestjs/common';
import { FormulaEvaluatorService } from './formula-evaluator.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { FiscalModule } from '@/common/fiscal/fiscal.module';

@Global()
@Module({
  imports: [PrismaModule, FiscalModule],
  providers: [FormulaEvaluatorService],
  exports: [FormulaEvaluatorService],
})
export class FormulaModule {}
