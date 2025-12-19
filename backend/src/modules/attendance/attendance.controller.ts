import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in/:employeeId')
  @ApiOperation({ summary: 'Registrar entrada' })
  checkIn(@Param('employeeId') employeeId: string) {
    return this.attendanceService.checkIn(employeeId);
  }

  @Post('check-out/:employeeId')
  @ApiOperation({ summary: 'Registrar salida' })
  checkOut(@Param('employeeId') employeeId: string) {
    return this.attendanceService.checkOut(employeeId);
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Obtener asistencia del empleado' })
  getEmployeeAttendance(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.attendanceService.getEmployeeAttendance(
      employeeId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('daily')
  @ApiOperation({ summary: 'Asistencia diaria de la empresa' })
  getDailyAttendance(
    @Query('companyId') companyId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getDailyAttendance(companyId, new Date(date));
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen de asistencia' })
  getAttendanceSummary(
    @Query('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.attendanceService.getAttendanceSummary(
      companyId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Post('mark-absent')
  @ApiOperation({ summary: 'Marcar ausencia' })
  markAbsent(
    @Body('employeeId') employeeId: string,
    @Body('date') date: string,
    @Body('notes') notes?: string,
  ) {
    return this.attendanceService.markAbsent(employeeId, new Date(date), notes);
  }

  @Post('break-start/:employeeId')
  @ApiOperation({ summary: 'Iniciar descanso/comida' })
  breakStart(@Param('employeeId') employeeId: string) {
    return this.attendanceService.breakStart(employeeId);
  }

  @Post('break-end/:employeeId')
  @ApiOperation({ summary: 'Terminar descanso/comida' })
  breakEnd(@Param('employeeId') employeeId: string) {
    return this.attendanceService.breakEnd(employeeId);
  }

  @Get('today/:employeeId')
  @ApiOperation({ summary: 'Obtener registro de hoy del empleado' })
  getTodayRecord(@Param('employeeId') employeeId: string) {
    return this.attendanceService.getTodayRecord(employeeId);
  }

  @Get('schedule/:employeeId')
  @ApiOperation({ summary: 'Obtener horario del empleado' })
  getEmployeeSchedule(@Param('employeeId') employeeId: string) {
    return this.attendanceService.getEmployeeWithSchedule(employeeId);
  }

  @Get('today-all')
  @ApiOperation({ summary: 'Obtener asistencia de todos los empleados hoy' })
  getAllEmployeesToday(@Query('companyId') companyId: string) {
    return this.attendanceService.getAllEmployeesToday(companyId);
  }

  @Post('update/:recordId')
  @ApiOperation({ summary: 'Actualizar registro de asistencia' })
  updateRecord(
    @Param('recordId') recordId: string,
    @Body() data: any,
  ) {
    return this.attendanceService.updateAttendanceRecord(recordId, data);
  }
}
