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
   * Approve request
   * - Managers can approve for subordinates
   * - RH can approve all in their company
   * - Company Admin can approve all in their company
   * - Super Admin can approve all
   */
  @Post(':id/approve')
  @Roles('admin', 'company_admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Aprobar solicitud' })
  async approveRequest(
    @Param('id') id: string,
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

    // For managers, check if they can approve (hierarchy-based)
    const skipHierarchyCheck = ['admin', 'company_admin', 'rh'].includes(user.role);

    return this.vacationsService.approveRequest(id, user.sub, skipHierarchyCheck);
  }

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

    return this.vacationsService.rejectRequest(id, reason);
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

  @Get('pending')
  @Roles('admin', 'company_admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Obtener solicitudes pendientes' })
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
