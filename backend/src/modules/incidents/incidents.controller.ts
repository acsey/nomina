import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '@/common/decorators';

@ApiTags('incidents')
@Controller('incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  // ===== Incident Types =====
  @Post('types')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Crear tipo de incidencia' })
  createType(@Body() createTypeDto: any) {
    return this.incidentsService.createIncidentType(createTypeDto);
  }

  @Get('types')
  @ApiOperation({ summary: 'Listar tipos de incidencia' })
  findAllTypes() {
    return this.incidentsService.findAllIncidentTypes();
  }

  @Get('types/:id')
  @ApiOperation({ summary: 'Obtener tipo de incidencia' })
  findOneType(@Param('id') id: string) {
    return this.incidentsService.findIncidentType(id);
  }

  @Patch('types/:id')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Actualizar tipo de incidencia' })
  updateType(@Param('id') id: string, @Body() updateTypeDto: any) {
    return this.incidentsService.updateIncidentType(id, updateTypeDto);
  }

  @Delete('types/:id')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Eliminar tipo de incidencia' })
  removeType(@Param('id') id: string) {
    return this.incidentsService.deleteIncidentType(id);
  }

  // ===== Employee Incidents =====
  /**
   * Create incident - Now allows:
   * - admin/company_admin/rh: Can create incidents for any employee in their company
   * - manager: Can create incidents for their subordinates only
   */
  @Post()
  @Roles('admin', 'company_admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Crear incidencia (manager solo para subordinados)' })
  async create(@Body() createIncidentDto: any, @CurrentUser() user: any) {
    // If user is manager, validate they can only create incidents for subordinates
    if (user.role === 'manager') {
      const canCreate = await this.incidentsService.canManagerCreateIncident(
        user.email,
        createIncidentDto.employeeId,
      );
      if (!canCreate) {
        throw new ForbiddenException(
          'Solo puedes registrar incidencias para tus subordinados',
        );
      }
    }

    // For company-bound users, verify the employee belongs to their company
    if (user.companyId && user.role !== 'admin') {
      const belongsToCompany = await this.incidentsService.employeeBelongsToCompany(
        createIncidentDto.employeeId,
        user.companyId,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException(
          'El empleado no pertenece a tu empresa',
        );
      }
    }

    return this.incidentsService.createIncident({
      ...createIncidentDto,
      createdByRole: user.role,
      createdByEmail: user.email,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar incidencias' })
  async findAll(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
    @Query('incidentTypeId') incidentTypeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: any,
  ) {
    // Apply company filter for non-super-admin users
    const companyId = user.role === 'admin' && !user.companyId ? undefined : user.companyId;

    // For managers, only show subordinates' incidents if no specific employeeId is requested
    let subordinateIds: string[] | undefined;
    if (user.role === 'manager' && !employeeId) {
      subordinateIds = await this.incidentsService.getManagerSubordinateIds(user.email);
    }

    // For employees, only show their own incidents
    let ownEmployeeId: string | undefined;
    if (user.role === 'employee') {
      const employee = await this.incidentsService.getEmployeeByEmail(user.email);
      ownEmployeeId = employee?.id;
    }

    return this.incidentsService.findAllIncidents({
      employeeId: ownEmployeeId || employeeId,
      incidentTypeId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
      companyId,
      subordinateIds,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener incidencia' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const incident = await this.incidentsService.findIncident(id);

    // Verify access based on role
    if (user.role === 'employee') {
      const employee = await this.incidentsService.getEmployeeByEmail(user.email);
      if (!employee || incident.employeeId !== employee.id) {
        throw new ForbiddenException('Solo puedes ver tus propias incidencias');
      }
    } else if (user.role === 'manager') {
      const canAccess = await this.incidentsService.canManagerCreateIncident(
        user.email,
        incident.employeeId,
      );
      if (!canAccess) {
        throw new ForbiddenException('Solo puedes ver incidencias de tus subordinados');
      }
    } else if (user.companyId && user.role !== 'admin') {
      // For company_admin and rh, verify the incident belongs to their company
      const belongsToCompany = await this.incidentsService.employeeBelongsToCompany(
        incident.employeeId,
        user.companyId,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException('La incidencia no pertenece a tu empresa');
      }
    }

    return incident;
  }

  @Patch(':id')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Actualizar incidencia' })
  async update(
    @Param('id') id: string,
    @Body() updateIncidentDto: any,
    @CurrentUser() user: any,
  ) {
    // Verify company access for non-super-admin
    if (user.companyId && user.role !== 'admin') {
      const incident = await this.incidentsService.findIncident(id);
      const belongsToCompany = await this.incidentsService.employeeBelongsToCompany(
        incident.employeeId,
        user.companyId,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException('La incidencia no pertenece a tu empresa');
      }
    }

    return this.incidentsService.updateIncident(id, updateIncidentDto);
  }

  @Post(':id/approve')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Aprobar incidencia' })
  async approve(@Param('id') id: string, @CurrentUser() user: any) {
    // Verify company access for non-super-admin
    if (user.companyId && user.role !== 'admin') {
      const incident = await this.incidentsService.findIncident(id);
      const belongsToCompany = await this.incidentsService.employeeBelongsToCompany(
        incident.employeeId,
        user.companyId,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException('La incidencia no pertenece a tu empresa');
      }
    }

    return this.incidentsService.approveIncident(id, user.id);
  }

  @Post(':id/reject')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Rechazar incidencia' })
  async reject(@Param('id') id: string, @CurrentUser() user: any) {
    // Verify company access for non-super-admin
    if (user.companyId && user.role !== 'admin') {
      const incident = await this.incidentsService.findIncident(id);
      const belongsToCompany = await this.incidentsService.employeeBelongsToCompany(
        incident.employeeId,
        user.companyId,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException('La incidencia no pertenece a tu empresa');
      }
    }

    return this.incidentsService.rejectIncident(id);
  }

  @Delete(':id')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Cancelar incidencia' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    // Verify company access for non-super-admin
    if (user.companyId && user.role !== 'admin') {
      const incident = await this.incidentsService.findIncident(id);
      const belongsToCompany = await this.incidentsService.employeeBelongsToCompany(
        incident.employeeId,
        user.companyId,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException('La incidencia no pertenece a tu empresa');
      }
    }

    return this.incidentsService.deleteIncident(id);
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Obtener incidencias del empleado' })
  async getEmployeeIncidents(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
    @CurrentUser() user?: any,
  ) {
    // Verify access based on role
    if (user.role === 'employee') {
      const employee = await this.incidentsService.getEmployeeByEmail(user.email);
      if (!employee || employee.id !== employeeId) {
        throw new ForbiddenException('Solo puedes ver tus propias incidencias');
      }
    } else if (user.role === 'manager') {
      const canAccess = await this.incidentsService.canManagerCreateIncident(
        user.email,
        employeeId,
      );
      if (!canAccess) {
        throw new ForbiddenException('Solo puedes ver incidencias de tus subordinados');
      }
    } else if (user.companyId && user.role !== 'admin') {
      const belongsToCompany = await this.incidentsService.employeeBelongsToCompany(
        employeeId,
        user.companyId,
      );
      if (!belongsToCompany) {
        throw new ForbiddenException('El empleado no pertenece a tu empresa');
      }
    }

    const yearNumber = year ? parseInt(year, 10) : undefined;
    return this.incidentsService.getEmployeeIncidents(employeeId, yearNumber);
  }

  /**
   * Get subordinates for manager - for dropdown selection
   */
  @Get('manager/subordinates')
  @Roles('manager')
  @ApiOperation({ summary: 'Obtener subordinados (solo managers)' })
  async getManagerSubordinates(@CurrentUser() user: any) {
    return this.incidentsService.getManagerSubordinates(user.email);
  }
}
