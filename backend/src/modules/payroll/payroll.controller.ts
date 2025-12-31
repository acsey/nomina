import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { PayrollReceiptService } from './services/payroll-receipt.service';
import { PayrollVersioningService } from './services/payroll-versioning.service';
import { FiscalAuditService } from '@/common/fiscal/fiscal-audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@/common/decorators';

@ApiTags('payroll')
@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly receiptService: PayrollReceiptService,
    private readonly versioningService: PayrollVersioningService,
    private readonly fiscalAuditService: FiscalAuditService,
  ) {}

  @Post('periods')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Crear periodo de nomina' })
  createPeriod(@Body() createPeriodDto: any) {
    return this.payrollService.createPeriod(createPeriodDto);
  }

  @Get('periods')
  @ApiOperation({ summary: 'Listar periodos de nomina' })
  findAllPeriods(
    @Query('companyId') companyId: string,
    @Query('year') year?: number,
  ) {
    return this.payrollService.findAllPeriods(companyId, year);
  }

  @Get('periods/:id')
  @ApiOperation({ summary: 'Obtener periodo de nomina' })
  findPeriod(@Param('id') id: string) {
    return this.payrollService.findPeriod(id);
  }

  @Patch('periods/:id')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Actualizar periodo de nomina (solo en estado borrador)' })
  updatePeriod(@Param('id') id: string, @Body() updateDto: any) {
    return this.payrollService.updatePeriod(id, updateDto);
  }

  @Delete('periods/:id')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Eliminar periodo de nomina (solo en estado borrador)' })
  deletePeriod(@Param('id') id: string) {
    return this.payrollService.deletePeriod(id);
  }

  @Get('periods/:id/preview')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Previsualizar calculo de nomina sin guardar' })
  previewPayroll(@Param('id') id: string) {
    return this.payrollService.previewPayroll(id);
  }

  @Post('periods/:id/calculate')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Calcular nomina del periodo' })
  calculatePayroll(@Param('id') id: string) {
    return this.payrollService.calculatePayroll(id);
  }

  @Post('periods/:id/approve')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Aprobar nomina del periodo (genera y timbra CFDI automaticamente)' })
  approvePayroll(@Param('id') id: string) {
    return this.payrollService.approvePayroll(id);
  }

  @Post('periods/:id/close')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Cerrar periodo de nomina' })
  closePayroll(@Param('id') id: string) {
    return this.payrollService.closePayroll(id);
  }

  @Get('employee/:employeeId/history')
  @ApiOperation({ summary: 'Historial de nomina del empleado' })
  getEmployeeHistory(
    @Param('employeeId') employeeId: string,
    @Query('limit') limit?: number,
  ) {
    return this.payrollService.getEmployeePayrollHistory(employeeId, limit);
  }

  // Recibos de nomina
  @Get('employee/:employeeId/receipts')
  @ApiOperation({ summary: 'Obtener recibos de nomina del empleado' })
  getEmployeeReceipts(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    return this.receiptService.getEmployeeReceipts(employeeId, yearNumber);
  }

  @Get('receipts/:detailId/pdf')
  @ApiOperation({ summary: 'Descargar recibo de nomina en PDF' })
  async downloadReceipt(
    @Param('detailId') detailId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.receiptService.generateReceipt(detailId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=recibo_nomina_${detailId}.pdf`,
      'Content-Length': pdf.length,
    });

    res.send(pdf);
  }

  @Get('receipts/:detailId/view')
  @ApiOperation({ summary: 'Ver recibo de nomina en PDF' })
  async viewReceipt(
    @Param('detailId') detailId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.receiptService.generateReceipt(detailId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=recibo_nomina_${detailId}.pdf`,
      'Content-Length': pdf.length,
    });

    res.send(pdf);
  }

  // ============================================
  // MEJORA: ENDPOINTS DE AUDITORÍA FISCAL
  // ============================================

  @Get('receipts/:detailId/fiscal-audit')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Obtener auditoría fiscal de un recibo' })
  async getReceiptFiscalAudit(@Param('detailId') detailId: string) {
    return this.fiscalAuditService.getReceiptFiscalAudit(detailId);
  }

  @Get('periods/:id/fiscal-audit')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Obtener auditoría fiscal de un período completo' })
  async getPeriodFiscalAudit(@Param('id') id: string) {
    return this.fiscalAuditService.getPeriodFiscalAudit(id);
  }

  @Get('periods/:id/fiscal-audit/summary')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Obtener resumen de auditoría fiscal por concepto' })
  async getPeriodFiscalAuditSummary(@Param('id') id: string) {
    return this.fiscalAuditService.getAuditSummaryByPeriod(id);
  }

  // ============================================
  // MEJORA: ENDPOINTS DE VERSIONADO DE RECIBOS
  // ============================================

  @Get('receipts/:detailId/versions')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Obtener historial de versiones de un recibo' })
  async getReceiptVersions(@Param('detailId') detailId: string) {
    return this.versioningService.getVersionHistory(detailId);
  }

  @Get('receipts/:detailId/versions/:version')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Obtener una versión específica del recibo' })
  async getReceiptVersion(
    @Param('detailId') detailId: string,
    @Param('version') version: string,
  ) {
    return this.versioningService.getVersion(detailId, parseInt(version, 10));
  }

  @Get('receipts/:detailId/versions/compare')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Comparar dos versiones de un recibo' })
  async compareVersions(
    @Param('detailId') detailId: string,
    @Query('versionA') versionA: string,
    @Query('versionB') versionB: string,
  ) {
    return this.versioningService.compareVersions(
      detailId,
      parseInt(versionA, 10),
      parseInt(versionB, 10),
    );
  }

  @Get('receipts/:detailId/can-modify')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Verificar si un recibo puede ser modificado' })
  async canModifyReceipt(@Param('detailId') detailId: string) {
    return this.versioningService.canModify(detailId);
  }

  @Get('periods/:id/stamped-status')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Verificar si el período tiene recibos timbrados' })
  async getPeriodStampedStatus(@Param('id') id: string) {
    return this.versioningService.periodHasStampedReceipts(id);
  }
}
