import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
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

  /**
   * Create vacation/leave request
   * - Employees can request for themselves
   * - Managers/RH/Admins can request on behalf of employees
   */
  @Post('request')
  @ApiOperation({ summary: 'Crear solicitud de vacaciones/permiso' })
  async createRequest(@Body() createRequestDto: any, @CurrentUser() user: any) {
    const employeeId = createRequestDto.employeeId;

    // Get user's employee record
    const userEmployee = await this.vacationsService.getEmployeeByEmail(user.email);

    // If employee role, can only request for themselves
    if (user.role === 'employee') {
      if (!userEmployee || userEmployee.id !== employeeId) {
        throw new ForbiddenException('Solo puedes crear solicitudes para ti mismo');
      }
    }

    // If manager, can request for themselves or subordinates
    if (user.role === 'manager') {
      if (userEmployee && userEmployee.id !== employeeId) {
        const canAccess = await this.vacationsService.isSubordinate(
          employeeId,
          userEmployee.id,
        );
        if (!canAccess) {
          throw new ForbiddenException(
            'Solo puedes crear solicitudes para ti o tus subordinados',
          );
        }
      }
    }

    // Company isolation for non-super-admin
    if (user.companyId && user.role !== 'admin') {
      const belongsToCompany = await this.vacationsService.employeeBelongsToCompany(
        employeeId,
        user.companyId,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException('El empleado no pertenece a tu empresa');
      }
    }

    return this.vacationsService.createRequest({
      ...createRequestDto,
      requestedBy: user.email,
    });
  }

  /**
   * PASO 1: Aprobación del supervisor
   * Solo managers pueden usar este endpoint para aprobar solicitudes de sus subordinados
   */
  @Post(':id/supervisor-approve')
  @Roles('admin', 'company_admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Aprobación del supervisor (Paso 1)' })
  async supervisorApproveRequest(
    @Param('id') id: string,
    @Body('comments') comments: string,
    @CurrentUser() user: any,
  ) {
    const request = await this.vacationsService.getRequestById(id);

    // Company isolation
    if (user.companyId && user.role !== 'admin') {
      const belongsToCompany = await this.vacationsService.employeeBelongsToCompany(
        request.employeeId,
        user.companyId,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException('La solicitud no pertenece a tu empresa');
      }
    }

    // Get the approver's employee ID
    const userEmployee = await this.vacationsService.getEmployeeByEmail(user.email);
    const approverId = userEmployee?.id || user.sub;

    // RH/Admin pueden saltar la verificación de jerarquía
    const isRHOrAdmin = ['admin', 'company_admin', 'rh'].includes(user.role);
    return this.vacationsService.supervisorApproveRequest(id, approverId, comments, isRHOrAdmin);
  }

  /**
   * PASO 2: Validación de RH (Aprobación final)
   * Solo RH, Company Admin o Super Admin pueden usar este endpoint
   */
  @Post(':id/rh-approve')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Validación de RH (Paso 2 - Aprobación final)' })
  async rhApproveRequest(
    @Param('id') id: string,
    @Body('comments') comments: string,
    @CurrentUser() user: any,
  ) {
    const request = await this.vacationsService.getRequestById(id);

    // Company isolation
    if (user.companyId && user.role !== 'admin') {
      const belongsToCompany = await this.vacationsService.employeeBelongsToCompany(
        request.employeeId,
        user.companyId,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException('La solicitud no pertenece a tu empresa');
      }
    }

    return this.vacationsService.rhApproveRequest(id, user.sub, comments);
  }

  /**
   * Aprobar solicitud (compatibilidad hacia atrás)
   * - Managers: aprueba como supervisor (paso 1)
   * - RH/Admin: puede aprobar ambos pasos si la solicitud está pendiente
   */
  @Post(':id/approve')
  @Roles('admin', 'company_admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Aprobar solicitud (auto-detecta paso según estado)' })
  async approveRequest(
    @Param('id') id: string,
    @Body('comments') comments: string,
    @CurrentUser() user: any,
  ) {
    const request = await this.vacationsService.getRequestById(id);

    // Company isolation
    if (user.companyId && user.role !== 'admin') {
      const belongsToCompany = await this.vacationsService.employeeBelongsToCompany(
        request.employeeId,
        user.companyId,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException('La solicitud no pertenece a tu empresa');
      }
    }

    // Determinar qué acción tomar según el estado y rol
    const isRHOrAdmin = ['admin', 'company_admin', 'rh'].includes(user.role);

    if (request.status === 'PENDING') {
      if (isRHOrAdmin) {
        // RH/Admin puede aprobar directamente ambos pasos (sin verificación de jerarquía)
        await this.vacationsService.supervisorApproveRequest(id, user.sub, comments, true);
        return this.vacationsService.rhApproveRequest(id, user.sub, comments);
      } else {
        // Manager solo aprueba paso 1
        const userEmployee = await this.vacationsService.getEmployeeByEmail(user.email);
        return this.vacationsService.supervisorApproveRequest(id, userEmployee?.id || user.sub, comments, false);
      }
    }

    if (request.status === 'SUPERVISOR_APPROVED') {
      if (!isRHOrAdmin) {
        throw new ForbiddenException('Solo RH o Admin pueden dar la aprobación final');
      }
      return this.vacationsService.rhApproveRequest(id, user.sub, comments);
    }

    throw new ForbiddenException('La solicitud no está en un estado que permita aprobación');
  }

  /**
   * Rechazar solicitud
   * - Managers pueden rechazar solicitudes PENDING de sus subordinados
   * - RH/Admin pueden rechazar en cualquier estado (PENDING o SUPERVISOR_APPROVED)
   */
  @Post(':id/reject')
  @Roles('admin', 'company_admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Rechazar solicitud' })
  async rejectRequest(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    const request = await this.vacationsService.getRequestById(id);

    // Company isolation
    if (user.companyId && user.role !== 'admin') {
      const belongsToCompany = await this.vacationsService.employeeBelongsToCompany(
        request.employeeId,
        user.companyId,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException('La solicitud no pertenece a tu empresa');
      }
    }

    // Determinar stage según estado y rol
    const isRHOrAdmin = ['admin', 'company_admin', 'rh'].includes(user.role);
    let stage: 'SUPERVISOR' | 'RH';

    if (request.status === 'PENDING') {
      stage = 'SUPERVISOR';
    } else if (request.status === 'SUPERVISOR_APPROVED') {
      if (!isRHOrAdmin) {
        throw new ForbiddenException('Solo RH o Admin pueden rechazar solicitudes ya aprobadas por supervisor');
      }
      stage = 'RH';
    } else {
      throw new ForbiddenException('La solicitud no está en un estado que permita rechazo');
    }

    return this.vacationsService.rejectRequest(id, reason, user.sub, stage);
  }

  @Get('balance/:employeeId')
  @ApiOperation({ summary: 'Obtener balance de vacaciones' })
  async getBalance(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: number,
    @CurrentUser() user?: any,
  ) {
    // Access control
    await this.validateEmployeeAccess(employeeId, user);

    return this.vacationsService.getBalance(
      employeeId,
      year || new Date().getFullYear(),
    );
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Obtener solicitudes del empleado' })
  async getEmployeeRequests(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: number,
    @CurrentUser() user?: any,
  ) {
    // Access control
    await this.validateEmployeeAccess(employeeId, user);

    return this.vacationsService.getEmployeeRequests(employeeId, year);
  }

  /**
   * Get own requests (for employee portal)
   */
  @Get('my-requests')
  @ApiOperation({ summary: 'Obtener mis solicitudes' })
  async getMyRequests(@CurrentUser() user: any, @Query('year') year?: number) {
    const employee = await this.vacationsService.getEmployeeByEmail(user.email);
    if (!employee) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.vacationsService.getEmployeeRequests(employee.id, year);
  }

  /**
   * Get my balance (for employee portal)
   */
  @Get('my-balance')
  @ApiOperation({ summary: 'Obtener mi balance de vacaciones' })
  async getMyBalance(@CurrentUser() user: any, @Query('year') year?: number) {
    const employee = await this.vacationsService.getEmployeeByEmail(user.email);
    if (!employee) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }
    return this.vacationsService.getBalance(
      employee.id,
      year || new Date().getFullYear(),
    );
  }

  /**
   * Obtener solicitudes pendientes de aprobación del supervisor
   * Para managers: solo subordinados directos
   */
  @Get('pending')
  @Roles('admin', 'company_admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Obtener solicitudes pendientes de supervisor' })
  async getPendingRequests(
    @Query('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    // For managers, only show subordinates' requests
    if (user.role === 'manager') {
      const employee = await this.vacationsService.getEmployeeByEmail(user.email);
      if (employee) {
        return this.vacationsService.getPendingRequestsForManager(employee.id, user.companyId);
      }
      return [];
    }

    // For company-bound users, use their companyId
    const effectiveCompanyId = user.role === 'admin' && !user.companyId
      ? companyId
      : user.companyId;

    return this.vacationsService.getPendingRequests(effectiveCompanyId);
  }

  /**
   * Obtener solicitudes aprobadas por supervisor, pendientes de validación de RH
   * Solo para RH, Company Admin y Super Admin
   */
  @Get('pending-rh-validation')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Obtener solicitudes pendientes de validación de RH' })
  async getPendingRHValidation(
    @Query('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    // For company-bound users, use their companyId
    const effectiveCompanyId = user.role === 'admin' && !user.companyId
      ? companyId
      : user.companyId;

    return this.vacationsService.getPendingRHValidation(effectiveCompanyId);
  }

  /**
   * Obtener todas las solicitudes pendientes (PENDING + SUPERVISOR_APPROVED)
   * Solo para RH, Company Admin y Super Admin
   */
  @Get('pending-all')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Obtener todas las solicitudes pendientes' })
  async getAllPendingRequests(
    @Query('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    // For company-bound users, use their companyId
    const effectiveCompanyId = user.role === 'admin' && !user.companyId
      ? companyId
      : user.companyId;

    return this.vacationsService.getAllPendingRequests(effectiveCompanyId);
  }

  @Get('leave-types')
  @ApiOperation({ summary: 'Obtener configuracion de tipos de ausencia' })
  getLeaveTypeConfigs() {
    return this.vacationsService.getLeaveTypeConfigs();
  }

  /**
   * Get leave types that employees can request themselves
   */
  @Get('leave-types/requestable')
  @ApiOperation({ summary: 'Obtener tipos de permiso que el empleado puede solicitar' })
  getRequestableLeaveTypes() {
    return this.vacationsService.getRequestableLeaveTypes();
  }

  @Get('schedule/:employeeId')
  @ApiOperation({ summary: 'Obtener horario laboral del empleado' })
  async getEmployeeSchedule(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    await this.validateEmployeeAccess(employeeId, user);
    return this.vacationsService.getEmployeeSchedule(employeeId);
  }

  @Get('preview')
  @ApiOperation({ summary: 'Previsualizar dias de vacaciones segun horario' })
  async previewVacationDays(
    @Query('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any,
  ) {
    await this.validateEmployeeAccess(employeeId, user);
    return this.vacationsService.previewVacationDays(
      employeeId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('approvers/:employeeId')
  @ApiOperation({ summary: 'Obtener autorizadores para un empleado' })
  async getApproversForEmployee(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    await this.validateEmployeeAccess(employeeId, user);
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

  /**
   * Helper to validate employee access based on role
   */
  private async validateEmployeeAccess(employeeId: string, user: any) {
    // Super admin can access all
    if (user.role === 'admin' && !user.companyId) {
      return;
    }

    // Company isolation
    if (user.companyId) {
      const belongsToCompany = await this.vacationsService.employeeBelongsToCompany(
        employeeId,
        user.companyId,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException('El empleado no pertenece a tu empresa');
      }
    }

    // Employee can only access their own data
    if (user.role === 'employee') {
      const userEmployee = await this.vacationsService.getEmployeeByEmail(user.email);
      if (!userEmployee || userEmployee.id !== employeeId) {
        throw new ForbiddenException('Solo puedes acceder a tus propios datos');
      }
    }

    // Manager can access own data or subordinates
    if (user.role === 'manager') {
      const userEmployee = await this.vacationsService.getEmployeeByEmail(user.email);
      if (userEmployee && userEmployee.id !== employeeId) {
        const canAccess = await this.vacationsService.isSubordinate(
          employeeId,
          userEmployee.id,
        );
        if (!canAccess) {
          throw new ForbiddenException('Solo puedes acceder a datos de tus subordinados');
        }
      }
    }
  }
}
