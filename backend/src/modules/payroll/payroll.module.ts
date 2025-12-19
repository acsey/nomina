import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PayrollCalculatorService } from './services/payroll-calculator.service';
import { IsrCalculatorService } from './services/isr-calculator.service';
import { ImssCalculatorService } from './services/imss-calculator.service';

@Module({
  controllers: [PayrollController],
  providers: [
    PayrollService,
    PayrollCalculatorService,
    IsrCalculatorService,
    ImssCalculatorService,
  ],
  exports: [PayrollService],
})
export class PayrollModule {}
