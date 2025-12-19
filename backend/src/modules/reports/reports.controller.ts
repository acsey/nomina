import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@/common/decorators';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('payroll/:periodId')
  @ApiOperation({ summary: 'Resumen de nómina del período' })
  getPayrollSummary(@Param('periodId') periodId: string) {
    return this.reportsService.getPayrollSummary(periodId);
  }

  @Get('payroll/:periodId/excel')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Exportar nómina a Excel' })
  async getPayrollExcel(
    @Param('periodId') periodId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generatePayrollExcel(periodId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="nomina_${periodId}.xlsx"`,
    });

    res.send(buffer);
  }

  @Get('payroll/:periodId/pdf')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Exportar nómina a PDF' })
  async getPayrollPdf(
    @Param('periodId') periodId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generatePayrollPdf(periodId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="nomina_${periodId}.pdf"`,
    });

    res.send(buffer);
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Reporte anual del empleado' })
  getEmployeeReport(
    @Param('employeeId') employeeId: string,
    @Query('year') year: number,
  ) {
    return this.reportsService.getEmployeeReport(
      employeeId,
      year || new Date().getFullYear(),
    );
  }

  @Get('department/:departmentId')
  @ApiOperation({ summary: 'Reporte de departamento' })
  getDepartmentReport(
    @Param('departmentId') departmentId: string,
    @Query('periodId') periodId: string,
  ) {
    return this.reportsService.getDepartmentReport(departmentId, periodId);
  }

  @Get('payroll/:periodId/dispersion/excel')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Exportar archivo de dispersión bancaria a Excel' })
  async getBankDispersionExcel(
    @Param('periodId') periodId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateBankDispersionExcel(periodId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="dispersion_bancaria_${periodId}.xlsx"`,
    });

    res.send(buffer);
  }

  @Get('payroll/:periodId/dispersion/txt')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Exportar archivo de dispersión bancaria a TXT' })
  async getBankDispersionTxt(
    @Param('periodId') periodId: string,
    @Res() res: Response,
  ) {
    const content = await this.reportsService.generateBankDispersionTxt(periodId);

    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="dispersion_bancaria_${periodId}.txt"`,
    });

    res.send(content);
  }

  // ========================================
  // REPORTES GUBERNAMENTALES
  // ========================================

  @Get('payroll/:periodId/imss')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Reporte de cuotas IMSS' })
  async getImssReport(@Param('periodId') periodId: string) {
    return this.reportsService.generateImssReport(periodId);
  }

  @Get('payroll/:periodId/imss/excel')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Exportar reporte IMSS a Excel' })
  async getImssExcel(
    @Param('periodId') periodId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateImssExcel(periodId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte_imss_${periodId}.xlsx"`,
    });

    res.send(buffer);
  }

  @Get('payroll/:periodId/issste')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Reporte de cuotas ISSSTE' })
  async getIssteReport(@Param('periodId') periodId: string) {
    return this.reportsService.generateIssteReport(periodId);
  }

  @Get('payroll/:periodId/issste/excel')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Exportar reporte ISSSTE a Excel' })
  async getIssteExcel(
    @Param('periodId') periodId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateIssteExcel(periodId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte_issste_${periodId}.xlsx"`,
    });

    res.send(buffer);
  }

  @Get('payroll/:periodId/infonavit')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Reporte de descuentos INFONAVIT' })
  async getInfonavitReport(@Param('periodId') periodId: string) {
    return this.reportsService.generateInfonavitReport(periodId);
  }

  @Get('payroll/:periodId/sua')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Generar archivo SUA' })
  async getSuaFile(
    @Param('periodId') periodId: string,
    @Res() res: Response,
  ) {
    const content = await this.reportsService.generateSuaFile(periodId);

    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="sua_${periodId}.txt"`,
    });

    res.send(content);
  }
}
