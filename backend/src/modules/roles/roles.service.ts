import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateRoleDto, UpdateRolePermissionsDto } from './dto';
import { ROLE_PERMISSIONS, RoleName, ROLE_INFO } from '../../common/constants/roles';

/**
 * Catálogo de todos los permisos disponibles en el sistema
 * Organizado por recurso para facilitar la UI
 */
export const PERMISSIONS_CATALOG = {
  system: {
    name: 'Sistema',
    permissions: [
      { code: 'system:config', name: 'Configuración del sistema', description: 'Acceso a configuración global' },
      { code: 'system:maintenance', name: 'Mantenimiento', description: 'Operaciones de mantenimiento del sistema' },
    ]
  },
  companies: {
    name: 'Empresas',
    permissions: [
      { code: 'companies:read', name: 'Ver empresas', description: 'Ver lista de empresas' },
      { code: 'companies:write', name: 'Editar empresas', description: 'Modificar información de empresas' },
      { code: 'companies:create', name: 'Crear empresas', description: 'Crear nuevas empresas' },
      { code: 'companies:delete', name: 'Eliminar empresas', description: 'Eliminar empresas' },
    ]
  },
  users: {
    name: 'Usuarios',
    permissions: [
      { code: 'users:read:company', name: 'Ver usuarios', description: 'Ver usuarios de la empresa' },
      { code: 'users:write:company', name: 'Editar usuarios', description: 'Modificar usuarios de la empresa' },
      { code: 'users:create:company', name: 'Crear usuarios', description: 'Crear usuarios en la empresa' },
      { code: 'users:delete:company', name: 'Eliminar usuarios', description: 'Eliminar usuarios de la empresa' },
    ]
  },
  employees: {
    name: 'Empleados',
    permissions: [
      { code: 'employees:read:company', name: 'Ver empleados', description: 'Ver empleados de la empresa' },
      { code: 'employees:write:company', name: 'Editar empleados', description: 'Modificar empleados de la empresa' },
      { code: 'employees:create:company', name: 'Crear empleados', description: 'Crear empleados en la empresa' },
      { code: 'employees:deactivate:company', name: 'Desactivar empleados', description: 'Dar de baja empleados' },
      { code: 'employees:read:subordinates', name: 'Ver subordinados', description: 'Ver empleados subordinados' },
    ]
  },
  payroll: {
    name: 'Nómina',
    permissions: [
      { code: 'payroll:read:company', name: 'Ver nómina', description: 'Ver períodos de nómina' },
      { code: 'payroll:write:company', name: 'Editar nómina', description: 'Modificar períodos de nómina' },
      { code: 'payroll:calculate:company', name: 'Calcular nómina', description: 'Ejecutar cálculos de nómina' },
      { code: 'payroll:preview:company', name: 'Vista previa', description: 'Ver vista previa de nómina' },
      { code: 'payroll:stamp:company', name: 'Timbrar nómina', description: 'Timbrar CFDI de nómina' },
      { code: 'payroll:cancel:company', name: 'Cancelar nómina', description: 'Cancelar timbres de nómina' },
      { code: 'payroll:approve', name: 'Aprobar nómina', description: 'Aprobar nómina para pago' },
      { code: 'payroll:read:subordinates', name: 'Ver nómina subordinados', description: 'Ver nómina de subordinados' },
      { code: 'payroll:read:own', name: 'Ver nómina propia', description: 'Ver recibos de nómina propios' },
    ]
  },
  incidents: {
    name: 'Incidencias',
    permissions: [
      { code: 'incidents:read:company', name: 'Ver incidencias', description: 'Ver incidencias de la empresa' },
      { code: 'incidents:write:company', name: 'Editar incidencias', description: 'Modificar incidencias' },
      { code: 'incidents:create:company', name: 'Crear incidencias', description: 'Crear nuevas incidencias' },
      { code: 'incidents:approve', name: 'Aprobar incidencias', description: 'Aprobar o rechazar incidencias' },
      { code: 'incidents:read:subordinates', name: 'Ver incidencias subordinados', description: 'Ver incidencias de subordinados' },
      { code: 'incidents:create:subordinates', name: 'Crear incidencias subordinados', description: 'Crear incidencias para subordinados' },
      { code: 'incidents:read:own', name: 'Ver incidencias propias', description: 'Ver incidencias propias' },
    ]
  },
  vacations: {
    name: 'Vacaciones',
    permissions: [
      { code: 'vacations:read:company', name: 'Ver vacaciones', description: 'Ver vacaciones de la empresa' },
      { code: 'vacations:write:company', name: 'Editar vacaciones', description: 'Modificar solicitudes de vacaciones' },
      { code: 'vacations:approve:company', name: 'Aprobar vacaciones (empresa)', description: 'Aprobar vacaciones de cualquier empleado' },
      { code: 'vacations:approve', name: 'Aprobar vacaciones', description: 'Aprobar vacaciones' },
      { code: 'vacations:read:subordinates', name: 'Ver vacaciones subordinados', description: 'Ver vacaciones de subordinados' },
      { code: 'vacations:approve:subordinates', name: 'Aprobar vacaciones subordinados', description: 'Aprobar vacaciones de subordinados' },
      { code: 'vacations:create:own', name: 'Solicitar vacaciones', description: 'Solicitar vacaciones propias' },
      { code: 'vacations:read:own', name: 'Ver vacaciones propias', description: 'Ver solicitudes de vacaciones propias' },
      { code: 'vacations:cancel:own', name: 'Cancelar vacaciones propias', description: 'Cancelar solicitudes propias' },
    ]
  },
  benefits: {
    name: 'Beneficios',
    permissions: [
      { code: 'benefits:read:company', name: 'Ver beneficios', description: 'Ver beneficios de la empresa' },
      { code: 'benefits:write:company', name: 'Editar beneficios', description: 'Modificar beneficios' },
      { code: 'benefits:assign:company', name: 'Asignar beneficios', description: 'Asignar beneficios a empleados' },
      { code: 'benefits:approve', name: 'Aprobar beneficios', description: 'Aprobar solicitudes de beneficios' },
      { code: 'benefits:read:own', name: 'Ver beneficios propios', description: 'Ver beneficios propios' },
    ]
  },
  attendance: {
    name: 'Asistencia',
    permissions: [
      { code: 'attendance:read:company', name: 'Ver asistencia', description: 'Ver registros de asistencia' },
      { code: 'attendance:write:company', name: 'Editar asistencia', description: 'Modificar registros de asistencia' },
      { code: 'attendance:read:subordinates', name: 'Ver asistencia subordinados', description: 'Ver asistencia de subordinados' },
      { code: 'attendance:approve:subordinates', name: 'Aprobar asistencia subordinados', description: 'Aprobar registros de subordinados' },
      { code: 'attendance:read:own', name: 'Ver asistencia propia', description: 'Ver registros de asistencia propios' },
      { code: 'attendance:clock:own', name: 'Registrar entrada/salida', description: 'Registrar checada propia' },
    ]
  },
  reports: {
    name: 'Reportes',
    permissions: [
      { code: 'reports:read:company', name: 'Ver reportes', description: 'Acceso a reportes de la empresa' },
      { code: 'reports:export:company', name: 'Exportar reportes', description: 'Exportar reportes a Excel/PDF' },
      { code: 'reports:read:subordinates', name: 'Ver reportes subordinados', description: 'Reportes de subordinados' },
    ]
  },
  settings: {
    name: 'Configuración',
    permissions: [
      { code: 'settings:read:company', name: 'Ver configuración', description: 'Ver configuración de la empresa' },
      { code: 'settings:write:company', name: 'Editar configuración', description: 'Modificar configuración de la empresa' },
    ]
  },
  audit: {
    name: 'Auditoría',
    permissions: [
      { code: 'audit:read:company', name: 'Ver auditoría', description: 'Ver logs de auditoría' },
      { code: 'audit:export:company', name: 'Exportar auditoría', description: 'Exportar logs de auditoría' },
    ]
  },
  profile: {
    name: 'Perfil',
    permissions: [
      { code: 'profile:read:own', name: 'Ver perfil propio', description: 'Ver información de perfil' },
      { code: 'profile:write:own', name: 'Editar perfil propio', description: 'Modificar información de perfil' },
    ]
  },
  documents: {
    name: 'Documentos',
    permissions: [
      { code: 'documents:read:own', name: 'Ver documentos propios', description: 'Ver documentos del empleado' },
      { code: 'documents:download:own', name: 'Descargar documentos', description: 'Descargar documentos propios' },
    ]
  },
};

/**
 * Lista plana de todos los permisos para validación
 */
export function getAllPermissionCodes(): string[] {
  const codes: string[] = [];
  for (const category of Object.values(PERMISSIONS_CATALOG)) {
    for (const perm of category.permissions) {
      codes.push(perm.code);
    }
  }
  // También agregar wildcards
  codes.push('*');
  codes.push('companies:*');
  codes.push('users:*');
  codes.push('employees:*');
  codes.push('employees:*:company');
  codes.push('payroll:*');
  codes.push('payroll:*:company');
  codes.push('incidents:*');
  codes.push('incidents:*:company');
  codes.push('vacations:*');
  codes.push('vacations:*:company');
  codes.push('benefits:*');
  codes.push('benefits:*:company');
  codes.push('attendance:*');
  codes.push('attendance:*:company');
  codes.push('reports:*');
  codes.push('reports:*:company');
  codes.push('settings:*');
  codes.push('audit:*');
  return codes;
}

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los roles del sistema
   */
  async findAll() {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    return roles.map(role => ({
      ...role,
      permissions: role.permissions as string[],
      usersCount: role._count.users,
      roleInfo: ROLE_INFO[role.name as RoleName] || null,
      isSystemAdmin: role.name === RoleName.SYSTEM_ADMIN,
      isEditable: role.name !== RoleName.SYSTEM_ADMIN, // No se puede editar SYSTEM_ADMIN
    }));
  }

  /**
   * Obtiene un rol por ID
   */
  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true }
        },
        users: {
          take: 10,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return {
      ...role,
      permissions: role.permissions as string[],
      usersCount: role._count.users,
      roleInfo: ROLE_INFO[role.name as RoleName] || null,
      isSystemAdmin: role.name === RoleName.SYSTEM_ADMIN,
      isEditable: role.name !== RoleName.SYSTEM_ADMIN,
      defaultPermissions: ROLE_PERMISSIONS[role.name as RoleName] || [],
    };
  }

  /**
   * Obtiene un rol por nombre
   */
  async findByName(name: string) {
    const role = await this.prisma.role.findUnique({
      where: { name },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!role) {
      throw new NotFoundException(`Rol ${name} no encontrado`);
    }

    return {
      ...role,
      permissions: role.permissions as string[],
      usersCount: role._count.users,
    };
  }

  /**
   * Actualiza la descripción de un rol
   */
  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    if (role.name === RoleName.SYSTEM_ADMIN) {
      throw new ForbiddenException('No se puede modificar el rol de Administrador del Sistema');
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        description: dto.description,
      },
    });
  }

  /**
   * Actualiza los permisos de un rol
   */
  async updatePermissions(id: string, dto: UpdateRolePermissionsDto, currentUserRole: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    if (role.name === RoleName.SYSTEM_ADMIN) {
      throw new ForbiddenException('No se pueden modificar los permisos del Administrador del Sistema');
    }

    // Solo SYSTEM_ADMIN puede modificar permisos
    if (currentUserRole !== RoleName.SYSTEM_ADMIN) {
      throw new ForbiddenException('Solo el Administrador del Sistema puede modificar permisos');
    }

    // Validar que los permisos sean válidos
    const validPermissions = getAllPermissionCodes();
    const invalidPermissions = dto.permissions.filter(p => !validPermissions.includes(p));

    if (invalidPermissions.length > 0) {
      throw new BadRequestException(`Permisos inválidos: ${invalidPermissions.join(', ')}`);
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        permissions: dto.permissions,
      },
    });
  }

  /**
   * Restaura los permisos predeterminados de un rol
   */
  async resetToDefaultPermissions(id: string, currentUserRole: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    if (role.name === RoleName.SYSTEM_ADMIN) {
      throw new ForbiddenException('No se pueden modificar los permisos del Administrador del Sistema');
    }

    if (currentUserRole !== RoleName.SYSTEM_ADMIN) {
      throw new ForbiddenException('Solo el Administrador del Sistema puede modificar permisos');
    }

    const defaultPermissions = ROLE_PERMISSIONS[role.name as RoleName];

    if (!defaultPermissions) {
      throw new BadRequestException(`No hay permisos predeterminados para el rol ${role.name}`);
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        permissions: defaultPermissions,
      },
    });
  }

  /**
   * Obtiene el catálogo de todos los permisos disponibles
   */
  getPermissionsCatalog() {
    return PERMISSIONS_CATALOG;
  }

  /**
   * Obtiene los permisos predeterminados de cada rol
   */
  getDefaultPermissions() {
    return Object.entries(ROLE_PERMISSIONS).map(([roleName, permissions]) => ({
      roleName,
      roleInfo: ROLE_INFO[roleName as RoleName] || null,
      permissions,
      isSystemAdmin: roleName === RoleName.SYSTEM_ADMIN,
    }));
  }

  /**
   * Sincroniza los roles de la base de datos con los roles definidos en el sistema
   * Crea roles faltantes y actualiza permisos si están vacíos
   */
  async syncRoles() {
    const results = {
      created: [] as string[],
      updated: [] as string[],
      existing: [] as string[],
    };

    for (const [roleName, roleInfo] of Object.entries(ROLE_INFO)) {
      const existingRole = await this.prisma.role.findUnique({
        where: { name: roleName },
      });

      if (!existingRole) {
        // Crear rol
        await this.prisma.role.create({
          data: {
            name: roleName,
            description: roleInfo.description,
            permissions: ROLE_PERMISSIONS[roleName as RoleName] || [],
          },
        });
        results.created.push(roleName);
      } else {
        // Verificar si tiene permisos vacíos
        const currentPerms = existingRole.permissions as string[];
        if (!currentPerms || currentPerms.length === 0) {
          await this.prisma.role.update({
            where: { id: existingRole.id },
            data: {
              permissions: ROLE_PERMISSIONS[roleName as RoleName] || [],
            },
          });
          results.updated.push(roleName);
        } else {
          results.existing.push(roleName);
        }
      }
    }

    return results;
  }
}
