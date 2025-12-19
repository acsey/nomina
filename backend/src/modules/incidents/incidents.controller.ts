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
  @Roles('admin', 'rh')
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
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Actualizar tipo de incidencia' })
  updateType(@Param('id') id: string, @Body() updateTypeDto: any) {
    return this.incidentsService.updateIncidentType(id, updateTypeDto);
  }

  @Delete('types/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar tipo de incidencia' })
  removeType(@Param('id') id: string) {
    return this.incidentsService.deleteIncidentType(id);
  }

  // ===== Employee Incidents =====
  @Post()
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Crear incidencia' })
  create(@Body() createIncidentDto: any) {
    return this.incidentsService.createIncident(createIncidentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar incidencias' })
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('incidentTypeId') incidentTypeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: any,
  ) {
    return this.incidentsService.findAllIncidents({
      employeeId,
      incidentTypeId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener incidencia' })
  findOne(@Param('id') id: string) {
    return this.incidentsService.findIncident(id);
  }

  @Patch(':id')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Actualizar incidencia' })
  update(@Param('id') id: string, @Body() updateIncidentDto: any) {
    return this.incidentsService.updateIncident(id, updateIncidentDto);
  }

  @Post(':id/approve')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Aprobar incidencia' })
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.incidentsService.approveIncident(id, user.id);
  }

  @Post(':id/reject')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Rechazar incidencia' })
  reject(@Param('id') id: string) {
    return this.incidentsService.rejectIncident(id);
  }

  @Delete(':id')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Cancelar incidencia' })
  remove(@Param('id') id: string) {
    return this.incidentsService.deleteIncident(id);
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Obtener incidencias del empleado' })
  getEmployeeIncidents(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    return this.incidentsService.getEmployeeIncidents(employeeId, yearNumber);
  }
}
