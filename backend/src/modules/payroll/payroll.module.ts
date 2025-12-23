import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { LiquidationController } from './liquidation.controller';
import { PayrollCalculatorService } from './services/payroll-calculator.service';
import { IsrCalculatorService } from './services/isr-calculator.service';
import { ImssCalculatorService } from './services/imss-calculator.service';
import { PayrollReceiptService } from './services/payroll-receipt.service';
import { LiquidationCalculatorService } from './services/liquidation-calculator.service';
import { CfdiModule } from '../cfdi/cfdi.module';
import { AccountingConfigModule } from '../accounting-config/accounting-config.module';

@Module({
  imports: [CfdiModule, AccountingConfigModule],
  controllers: [PayrollController, LiquidationController],
  providers: [
    PayrollService,
    PayrollCalculatorService,
    IsrCalculatorService,
    ImssCalculatorService,
    PayrollReceiptService,
    LiquidationCalculatorService,
  ],
  exports: [PayrollService, PayrollReceiptService, LiquidationCalculatorService],
})
export class PayrollModule {}
