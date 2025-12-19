import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@/common/decorators';

@ApiTags('payroll')
@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('periods')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Crear período de nómina' })
  createPeriod(@Body() createPeriodDto: any) {
    return this.payrollService.createPeriod(createPeriodDto);
  }

  @Get('periods')
  @ApiOperation({ summary: 'Listar períodos de nómina' })
  findAllPeriods(
    @Query('companyId') companyId: string,
    @Query('year') year?: number,
  ) {
    return this.payrollService.findAllPeriods(companyId, year);
  }

  @Get('periods/:id')
  @ApiOperation({ summary: 'Obtener período de nómina' })
  findPeriod(@Param('id') id: string) {
    return this.payrollService.findPeriod(id);
  }

  @Post('periods/:id/calculate')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Calcular nómina del período' })
  calculatePayroll(@Param('id') id: string) {
    return this.payrollService.calculatePayroll(id);
  }

  @Post('periods/:id/approve')
  @Roles('admin')
  @ApiOperation({ summary: 'Aprobar nómina del período' })
  approvePayroll(@Param('id') id: string) {
    return this.payrollService.approvePayroll(id);
  }

  @Post('periods/:id/close')
  @Roles('admin')
  @ApiOperation({ summary: 'Cerrar período de nómina' })
  closePayroll(@Param('id') id: string) {
    return this.payrollService.closePayroll(id);
  }

  @Get('employee/:employeeId/history')
  @ApiOperation({ summary: 'Historial de nómina del empleado' })
  getEmployeeHistory(
    @Param('employeeId') employeeId: string,
    @Query('limit') limit?: number,
  ) {
    return this.payrollService.getEmployeePayrollHistory(employeeId, limit);
  }
}
