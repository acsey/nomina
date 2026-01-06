import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { AccountingConfigService } from './accounting-config.service';
import {
  CreateStateIsnConfigDto,
  UpdateStateIsnConfigDto,
  CreateFiscalValuesDto,
  UpdateFiscalValuesDto,
  CreateCompanyPayrollConfigDto,
  UpdateCompanyPayrollConfigDto,
  CreateIsrTableDto,
  UpdateIsrTableDto,
  CreateSubsidioEmpleoTableDto,
  UpdateSubsidioEmpleoTableDto,
  CreateImssRateDto,
  UpdateImssRateDto,
} from './dto/accounting-config.dto';
import { PeriodType } from '@/common/types/period-type';

@Controller('accounting-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountingConfigController {
  constructor(private readonly service: AccountingConfigService) {}

  // ============================================
  // DASHBOARD / SUMMARY
  // ============================================

  @Get('summary')
  @Roles('admin', 'company_admin')
  async getSummary() {
    return this.service.getAccountingConfigSummary();
  }

  // ============================================
  // STATE ISN CONFIG
  // ============================================

  @Get('isn')
  @Roles('admin', 'company_admin', 'rh')
  async getAllStateIsnConfigs(@Query('activeOnly') activeOnly?: string) {
    return this.service.getAllStateIsnConfigs(activeOnly !== 'false');
  }

  @Get('isn/:stateCode')
  @Roles('admin', 'company_admin', 'rh')
  async getStateIsnConfig(@Param('stateCode') stateCode: string) {
    return this.service.getStateIsnConfig(stateCode.toUpperCase());
  }

  @Get('isn/:stateCode/rate')
  @Roles('admin', 'company_admin', 'rh')
  async getIsnRateForState(@Param('stateCode') stateCode: string) {
    const rate = await this.service.getIsnRateForState(stateCode.toUpperCase());
    return { stateCode: stateCode.toUpperCase(), rate, ratePercent: rate * 100 };
  }

  @Post('isn')
  @Roles('admin')
  async createStateIsnConfig(@Body() dto: CreateStateIsnConfigDto) {
    dto.stateCode = dto.stateCode.toUpperCase();
    return this.service.createStateIsnConfig(dto);
  }

  @Patch('isn/:stateCode')
  @Roles('admin')
  async updateStateIsnConfig(
    @Param('stateCode') stateCode: string,
    @Body() dto: UpdateStateIsnConfigDto,
  ) {
    return this.service.updateStateIsnConfig(stateCode.toUpperCase(), dto);
  }

  // ============================================
  // FISCAL VALUES
  // ============================================

  @Get('fiscal')
  @Roles('admin', 'company_admin', 'rh')
  async getAllFiscalValues() {
    return this.service.getAllFiscalValues();
  }

  @Get('fiscal/current')
  @Roles('admin', 'company_admin', 'rh')
  async getCurrentFiscalValues() {
    return this.service.getCurrentFiscalValues();
  }

  @Get('fiscal/:year')
  @Roles('admin', 'company_admin', 'rh')
  async getFiscalValues(@Param('year') year: string) {
    return this.service.getFiscalValues(parseInt(year, 10));
  }

  @Post('fiscal')
  @Roles('admin')
  async createFiscalValues(@Body() dto: CreateFiscalValuesDto) {
    return this.service.createFiscalValues(dto);
  }

  @Patch('fiscal/:year')
  @Roles('admin')
  async updateFiscalValues(
    @Param('year') year: string,
    @Body() dto: UpdateFiscalValuesDto,
  ) {
    return this.service.updateFiscalValues(parseInt(year, 10), dto);
  }

  // ============================================
  // COMPANY PAYROLL CONFIG
  // ============================================

  @Get('company/:companyId')
  @Roles('admin', 'company_admin', 'rh')
  async getCompanyPayrollConfig(@Param('companyId') companyId: string) {
    return this.service.getCompanyPayrollConfig(companyId);
  }

  @Post('company')
  @Roles('admin', 'company_admin')
  async createOrUpdateCompanyPayrollConfig(@Body() dto: CreateCompanyPayrollConfigDto) {
    return this.service.createOrUpdateCompanyPayrollConfig(dto);
  }

  @Patch('company/:companyId')
  @Roles('admin', 'company_admin')
  async updateCompanyPayrollConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateCompanyPayrollConfigDto,
  ) {
    return this.service.updateCompanyPayrollConfig(companyId, dto);
  }

  // ============================================
  // ISR TABLE
  // ============================================

  @Get('isr')
  @Roles('admin', 'company_admin', 'rh')
  async getAllIsrTables() {
    return this.service.getAllIsrTables();
  }

  @Get('isr/:year/:periodType')
  @Roles('admin', 'company_admin', 'rh')
  async getIsrTable(
    @Param('year') year: string,
    @Param('periodType') periodType: PeriodType,
  ) {
    return this.service.getIsrTable(parseInt(year, 10), periodType);
  }

  @Post('isr/calculate')
  @Roles('admin', 'company_admin', 'rh')
  async calculateIsr(
    @Body() body: { taxableIncome: number; year: number; periodType: PeriodType },
  ) {
    return this.service.calculateIsr(body.taxableIncome, body.year, body.periodType);
  }

  @Post('isr')
  @Roles('admin')
  async createIsrTableRow(@Body() dto: CreateIsrTableDto) {
    return this.service.createIsrTableRow(dto);
  }

  @Patch('isr/:id')
  @Roles('admin')
  async updateIsrTableRow(@Param('id') id: string, @Body() dto: UpdateIsrTableDto) {
    return this.service.updateIsrTableRow(id, dto);
  }

  @Delete('isr/:id')
  @Roles('admin')
  async deleteIsrTableRow(@Param('id') id: string) {
    return this.service.deleteIsrTableRow(id);
  }

  // ============================================
  // SUBSIDIO AL EMPLEO TABLE
  // ============================================

  @Get('subsidio')
  @Roles('admin', 'company_admin', 'rh')
  async getAllSubsidioEmpleoTables() {
    return this.service.getAllSubsidioEmpleoTables();
  }

  @Get('subsidio/:year/:periodType')
  @Roles('admin', 'company_admin', 'rh')
  async getSubsidioEmpleoTable(
    @Param('year') year: string,
    @Param('periodType') periodType: PeriodType,
  ) {
    return this.service.getSubsidioEmpleoTable(parseInt(year, 10), periodType);
  }

  @Post('subsidio')
  @Roles('admin')
  async createSubsidioEmpleoTableRow(@Body() dto: CreateSubsidioEmpleoTableDto) {
    return this.service.createSubsidioEmpleoTableRow(dto);
  }

  @Patch('subsidio/:id')
  @Roles('admin')
  async updateSubsidioEmpleoTableRow(
    @Param('id') id: string,
    @Body() dto: UpdateSubsidioEmpleoTableDto,
  ) {
    return this.service.updateSubsidioEmpleoTableRow(id, dto);
  }

  @Delete('subsidio/:id')
  @Roles('admin')
  async deleteSubsidioEmpleoTableRow(@Param('id') id: string) {
    return this.service.deleteSubsidioEmpleoTableRow(id);
  }

  // ============================================
  // IMSS RATES
  // ============================================

  @Get('imss')
  @Roles('admin', 'company_admin', 'rh')
  async getAllImssRates() {
    return this.service.getAllImssRates();
  }

  @Get('imss/:year')
  @Roles('admin', 'company_admin', 'rh')
  async getImssRates(@Param('year') year: string) {
    return this.service.getImssRates(parseInt(year, 10));
  }

  @Post('imss')
  @Roles('admin')
  async createImssRate(@Body() dto: CreateImssRateDto) {
    return this.service.createImssRate(dto);
  }

  @Patch('imss/:id')
  @Roles('admin')
  async updateImssRate(@Param('id') id: string, @Body() dto: UpdateImssRateDto) {
    return this.service.updateImssRate(id, dto);
  }

  @Delete('imss/:id')
  @Roles('admin')
  async deleteImssRate(@Param('id') id: string) {
    return this.service.deleteImssRate(id);
  }
}
