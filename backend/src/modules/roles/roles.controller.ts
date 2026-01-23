import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateRoleDto, UpdateRolePermissionsDto } from './dto';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // =============================================
  // CATÁLOGO DE PERMISOS
  // =============================================

  @Get('permissions/catalog')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Obtener catálogo de permisos disponibles' })
  getPermissionsCatalog() {
    return this.rolesService.getPermissionsCatalog();
  }

  @Get('permissions/defaults')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Obtener permisos predeterminados por rol' })
  getDefaultPermissions() {
    return this.rolesService.getDefaultPermissions();
  }

  // =============================================
  // GESTIÓN DE ROLES
  // =============================================

  @Get()
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Obtener todos los roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Post('sync')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Sincronizar roles del sistema (crea faltantes, actualiza vacíos)' })
  syncRoles() {
    return this.rolesService.syncRoles();
  }

  @Get(':id')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Obtener rol por ID' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Get('name/:name')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Obtener rol por nombre' })
  @ApiParam({ name: 'name', description: 'Nombre del rol (ej: COMPANY_ADMIN)' })
  findByName(@Param('name') name: string) {
    return this.rolesService.findByName(name);
  }

  @Patch(':id')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Actualizar descripción del rol' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto
  ) {
    return this.rolesService.update(id, dto);
  }

  @Patch(':id/permissions')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Actualizar permisos del rol' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @Request() req: any
  ) {
    const currentUserRole = req.user?.roleName || req.user?.role?.name;
    return this.rolesService.updatePermissions(id, dto, currentUserRole);
  }

  @Post(':id/reset-permissions')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Restaurar permisos predeterminados del rol' })
  @ApiParam({ name: 'id', description: 'ID del rol' })
  resetPermissions(
    @Param('id') id: string,
    @Request() req: any
  ) {
    const currentUserRole = req.user?.roleName || req.user?.role?.name;
    return this.rolesService.resetToDefaultPermissions(id, currentUserRole);
  }
}
