import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { LiquidationController } from './liquidation.controller';
import { PayrollAnalyticsController } from './payroll-analytics.controller';
import { PayrollCalculatorService } from './services/payroll-calculator.service';
import { IsrCalculatorService } from './services/isr-calculator.service';
import { ImssCalculatorService } from './services/imss-calculator.service';
import { PayrollReceiptService } from './services/payroll-receipt.service';
import { LiquidationCalculatorService } from './services/liquidation-calculator.service';
import { PayrollSimulationService } from './services/payroll-simulation.service';
import { PayrollAnalyticsService } from './services/payroll-analytics.service';
import { CfdiModule } from '../cfdi/cfdi.module';
import { AccountingConfigModule } from '../accounting-config/accounting-config.module';

@Module({
  imports: [CfdiModule, AccountingConfigModule],
  controllers: [PayrollController, LiquidationController, PayrollAnalyticsController],
  providers: [
    PayrollService,
    PayrollCalculatorService,
    IsrCalculatorService,
    ImssCalculatorService,
    PayrollReceiptService,
    LiquidationCalculatorService,
    PayrollSimulationService,
    PayrollAnalyticsService,
  ],
  exports: [
    PayrollService,
    PayrollReceiptService,
    LiquidationCalculatorService,
    PayrollSimulationService,
    PayrollAnalyticsService,
  ],
})
export class PayrollModule {}
