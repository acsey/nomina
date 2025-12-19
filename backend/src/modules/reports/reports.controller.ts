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
  @Roles('admin', 'rh')
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
  @Roles('admin', 'rh')
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
}
