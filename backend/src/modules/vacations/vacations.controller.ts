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
import { VacationsService } from './vacations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '@/common/decorators';

@ApiTags('vacations')
@Controller('vacations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VacationsController {
  constructor(private readonly vacationsService: VacationsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Crear solicitud de vacaciones/permiso' })
  createRequest(@Body() createRequestDto: any) {
    return this.vacationsService.createRequest(createRequestDto);
  }

  @Post(':id/approve')
  @Roles('admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Aprobar solicitud' })
  approveRequest(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.vacationsService.approveRequest(id, userId);
  }

  @Post(':id/reject')
  @Roles('admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Rechazar solicitud' })
  rejectRequest(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.vacationsService.rejectRequest(id, reason);
  }

  @Get('balance/:employeeId')
  @ApiOperation({ summary: 'Obtener balance de vacaciones' })
  getBalance(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: number,
  ) {
    return this.vacationsService.getBalance(
      employeeId,
      year || new Date().getFullYear(),
    );
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Obtener solicitudes del empleado' })
  getEmployeeRequests(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: number,
  ) {
    return this.vacationsService.getEmployeeRequests(employeeId, year);
  }

  @Get('pending')
  @Roles('admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Obtener solicitudes pendientes' })
  getPendingRequests(@Query('companyId') companyId: string) {
    return this.vacationsService.getPendingRequests(companyId);
  }

  @Get('leave-types')
  @ApiOperation({ summary: 'Obtener configuracion de tipos de ausencia' })
  getLeaveTypeConfigs() {
    return this.vacationsService.getLeaveTypeConfigs();
  }

  @Get('schedule/:employeeId')
  @ApiOperation({ summary: 'Obtener horario laboral del empleado' })
  getEmployeeSchedule(@Param('employeeId') employeeId: string) {
    return this.vacationsService.getEmployeeSchedule(employeeId);
  }

  @Get('preview')
  @ApiOperation({ summary: 'Previsualizar dias de vacaciones segun horario' })
  previewVacationDays(
    @Query('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.vacationsService.previewVacationDays(
      employeeId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('approvers/:employeeId')
  @ApiOperation({ summary: 'Obtener autorizadores para un empleado' })
  getApproversForEmployee(@Param('employeeId') employeeId: string) {
    return this.vacationsService.getApproversForEmployee(employeeId);
  }

  @Get('can-approve')
  @ApiOperation({ summary: 'Verificar si puede aprobar solicitud' })
  canApproveRequest(
    @Query('approverId') approverId: string,
    @Query('employeeId') employeeId: string,
  ) {
    return this.vacationsService.canApproveRequest(approverId, employeeId);
  }
}
