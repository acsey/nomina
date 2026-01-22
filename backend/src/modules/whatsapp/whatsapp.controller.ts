import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { GeofenceService } from './geofence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ModuleEnabledGuard, RequireModule } from '../../common/guards/module-enabled.guard';
import {
  CreateWhatsAppConfigDto,
  UpdateWhatsAppConfigDto,
  RegisterEmployeeWhatsAppDto,
  VerifyEmployeeWhatsAppDto,
  CreateGeofenceDto,
  UpdateGeofenceDto,
  AssignGeofenceDto,
  ManualAttendanceLogDto,
  AttendanceLogQueryDto,
} from './dto';

@ApiTags('WhatsApp Attendance')
@ApiBearerAuth()
@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard, ModuleEnabledGuard)
@RequireModule('whatsapp_attendance')
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly geofenceService: GeofenceService
  ) {}

  // =============================================
  // WhatsApp Configuration
  // =============================================

  @Get('config/:companyId')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Obtener configuración de WhatsApp' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  getConfig(@Param('companyId') companyId: string) {
    return this.whatsappService.getConfig(companyId);
  }

  @Post('config/:companyId')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Crear configuración de WhatsApp' })
  createConfig(
    @Param('companyId') companyId: string,
    @Body() dto: CreateWhatsAppConfigDto
  ) {
    return this.whatsappService.createConfig(companyId, dto);
  }

  @Patch('config/:companyId')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Actualizar configuración de WhatsApp' })
  updateConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateWhatsAppConfigDto
  ) {
    return this.whatsappService.updateConfig(companyId, dto);
  }

  // =============================================
  // Employee WhatsApp Registration
  // =============================================

  @Get('employees/:companyId')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Listar empleados con WhatsApp registrado' })
  getEmployeeList(@Param('companyId') companyId: string) {
    return this.whatsappService.getEmployeeWhatsAppList(companyId);
  }

  @Post('employees/:companyId/register')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Registrar WhatsApp de un empleado' })
  registerEmployee(
    @Param('companyId') companyId: string,
    @Body() dto: RegisterEmployeeWhatsAppDto
  ) {
    return this.whatsappService.registerEmployeeWhatsApp(companyId, dto);
  }

  @Post('employees/verify/:employeeWhatsAppId')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Verificar código de WhatsApp del empleado' })
  verifyEmployee(
    @Param('employeeWhatsAppId') id: string,
    @Body() dto: VerifyEmployeeWhatsAppDto
  ) {
    return this.whatsappService.verifyEmployeeWhatsApp(id, dto.verificationCode);
  }

  // =============================================
  // Geofences
  // =============================================

  @Get('geofences/:companyId')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Listar geocercas de la empresa' })
  getGeofences(@Param('companyId') companyId: string) {
    return this.geofenceService.findAll(companyId);
  }

  @Get('geofences/detail/:id')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Obtener detalle de geocerca' })
  getGeofence(@Param('id') id: string) {
    return this.geofenceService.findOne(id);
  }

  @Post('geofences/:companyId')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Crear geocerca' })
  createGeofence(
    @Param('companyId') companyId: string,
    @Body() dto: CreateGeofenceDto
  ) {
    return this.geofenceService.create(companyId, dto);
  }

  @Patch('geofences/:id')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Actualizar geocerca' })
  updateGeofence(@Param('id') id: string, @Body() dto: UpdateGeofenceDto) {
    return this.geofenceService.update(id, dto);
  }

  @Delete('geofences/:id')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Eliminar geocerca' })
  deleteGeofence(@Param('id') id: string) {
    return this.geofenceService.delete(id);
  }

  @Post('geofences/:geofenceId/assign')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Asignar empleado a geocerca' })
  assignEmployeeToGeofence(
    @Param('geofenceId') geofenceId: string,
    @Body() dto: AssignGeofenceDto
  ) {
    return this.geofenceService.assignEmployee(geofenceId, dto);
  }

  @Delete('geofences/:geofenceId/unassign/:employeeId')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Desasignar empleado de geocerca' })
  unassignEmployee(
    @Param('geofenceId') geofenceId: string,
    @Param('employeeId') employeeId: string
  ) {
    return this.geofenceService.unassignEmployee(geofenceId, employeeId);
  }

  @Get('geofences/employee/:employeeId')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Obtener geocercas asignadas a un empleado' })
  getEmployeeGeofences(@Param('employeeId') employeeId: string) {
    return this.geofenceService.getEmployeeGeofences(employeeId);
  }

  // =============================================
  // Attendance Logs
  // =============================================

  @Get('logs/:companyId')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Obtener logs de asistencia por WhatsApp' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'status', required: false })
  getAttendanceLogs(
    @Param('companyId') companyId: string,
    @Query() query: AttendanceLogQueryDto
  ) {
    return this.whatsappService.getAttendanceLogs(companyId, query);
  }

  @Post('logs/:companyId/manual')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Crear registro de asistencia manual' })
  createManualLog(
    @Param('companyId') companyId: string,
    @Body() dto: ManualAttendanceLogDto
  ) {
    return this.whatsappService.manualAttendanceLog(companyId, dto);
  }

  @Patch('logs/:logId/approve')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Aprobar log de asistencia pendiente' })
  approveLog(
    @Param('logId') logId: string,
    @Body('adminNotes') adminNotes?: string
  ) {
    return this.whatsappService.approveAttendanceLog(logId, adminNotes);
  }

  @Patch('logs/:logId/reject')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Rechazar log de asistencia' })
  rejectLog(
    @Param('logId') logId: string,
    @Body('adminNotes') adminNotes: string
  ) {
    return this.whatsappService.rejectAttendanceLog(logId, adminNotes);
  }

  // =============================================
  // Location Validation
  // =============================================

  @Post('validate-location/:companyId')
  @Roles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: 'Validar ubicación contra geocercas' })
  validateLocation(
    @Param('companyId') companyId: string,
    @Body() body: { employeeId: string; latitude: number; longitude: number }
  ) {
    return this.geofenceService.validateLocation(
      companyId,
      body.employeeId,
      body.latitude,
      body.longitude
    );
  }
}
