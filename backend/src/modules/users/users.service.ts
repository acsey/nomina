import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { normalizeRole } from '@/common/decorators';
import { RoleName } from '@/common/constants/roles';
import * as bcrypt from 'bcrypt';

// Role hierarchy with both legacy and new role names
// Higher number = higher privilege
const ROLE_HIERARCHY: Record<string, number> = {
  // New role names
  [RoleName.SYSTEM_ADMIN]: 6,
  [RoleName.COMPANY_ADMIN]: 5,
  [RoleName.HR_ADMIN]: 4,
  [RoleName.PAYROLL_ADMIN]: 4,
  [RoleName.AUDITOR]: 3,
  [RoleName.MANAGER]: 2,
  [RoleName.EMPLOYEE]: 1,
  // Legacy role names (for backward compatibility)
  admin: 6,
  company_admin: 5,
  rh: 4,
  manager: 2,
  employee: 1,
};

// Helper to check if user is super admin (SYSTEM_ADMIN without company)
// Handles both legacy 'admin' and new 'SYSTEM_ADMIN' roles
function isSuperAdmin(user: { role: string; companyId?: string | null }): boolean {
  const normalizedRole = normalizeRole(user.role);
  return normalizedRole === RoleName.SYSTEM_ADMIN && !user.companyId;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private canManageRole(currentUserRole: string, targetRole: string): boolean {
    const currentLevel = ROLE_HIERARCHY[currentUserRole] || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
    return currentLevel > targetLevel;
  }

  async create(createUserDto: CreateUserDto, currentUser: { role: string; companyId?: string }) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // Get the target role
    const targetRole = await this.prisma.role.findUnique({
      where: { id: createUserDto.roleId },
    });

    if (!targetRole) {
      throw new NotFoundException('Rol no encontrado');
    }

    // Check role hierarchy
    if (!this.canManageRole(currentUser.role, targetRole.name)) {
      throw new ForbiddenException('No tiene permisos para crear usuarios con este rol');
    }

    // Only super admin can create users for any company
    // All other users (including company_admin) can only create for their company
    let companyId = createUserDto.companyId;
    if (!isSuperAdmin(currentUser) && currentUser.companyId) {
      companyId = currentUser.companyId;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        roleId: createUserDto.roleId,
        companyId,
        isActive: createUserDto.isActive ?? true,
      },
      include: {
        role: true,
        company: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async findAll(currentUser: { role: string; companyId?: string }, params?: { skip?: number; take?: number; search?: string }) {
    const skip = Number(params?.skip) || 0;
    const take = Number(params?.take) || 20;
    const search = params?.search;

    // Build where clause based on role and company
    const where: any = {};

    // Only super admin (admin without companyId) can see all users
    // Company admins and other roles are restricted to their company
    if (!isSuperAdmin(currentUser) && currentUser.companyId) {
      where.companyId = currentUser.companyId;
    }

    // Filter by roles the current user can manage
    const currentLevel = ROLE_HIERARCHY[currentUser.role] || 0;
    const manageableRoles = Object.entries(ROLE_HIERARCHY)
      .filter(([_, level]) => level < currentLevel)
      .map(([role]) => role);

    if (manageableRoles.length > 0) {
      where.role = { name: { in: manageableRoles } };
    }

    // Search filter
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        include: {
          role: true,
          company: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Remove passwords from response
    const usersWithoutPassword = users.map(({ password, ...user }: any) => user);

    return {
      data: usersWithoutPassword,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string, currentUser: { role: string; companyId?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        company: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Check if current user can view this user
    // Only super admin bypasses these checks
    if (!isSuperAdmin(currentUser)) {
      // Company admins and other roles can only view users from their company
      if (currentUser.companyId && user.companyId !== currentUser.companyId) {
        throw new ForbiddenException('No tiene permisos para ver este usuario');
      }

      // Can only view users with lower or equal hierarchy
      if (!this.canManageRole(currentUser.role, user.role.name)) {
        throw new ForbiddenException('No tiene permisos para ver este usuario');
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: { role: string; companyId?: string }) {
    const user = await this.findOne(id, currentUser);

    // If changing role, check hierarchy
    if (updateUserDto.roleId) {
      const targetRole = await this.prisma.role.findUnique({
        where: { id: updateUserDto.roleId },
      });

      if (!targetRole) {
        throw new NotFoundException('Rol no encontrado');
      }

      if (!this.canManageRole(currentUser.role, targetRole.name)) {
        throw new ForbiddenException('No tiene permisos para asignar este rol');
      }
    }

    // Only super admin can change company assignment
    let companyId = updateUserDto.companyId;
    if (!isSuperAdmin(currentUser)) {
      companyId = user.companyId || currentUser.companyId;
    }

    // Prepare update data
    const updateData: any = {
      ...updateUserDto,
      companyId,
    };

    // Hash password if provided
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
        company: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = updatedUser;
    return result;
  }

  async remove(id: string, currentUser: { role: string; companyId?: string }) {
    await this.findOne(id, currentUser);

    // Soft delete - deactivate user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      include: {
        role: true,
        company: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = updatedUser;
    return result;
  }

  async getRoles(currentUser: { role: string }) {
    // Get roles the current user can assign
    const currentLevel = ROLE_HIERARCHY[currentUser.role] || 0;
    const manageableRoles = Object.entries(ROLE_HIERARCHY)
      .filter(([_, level]) => level < currentLevel)
      .map(([role]) => role);

    return this.prisma.role.findMany({
      where: {
        name: { in: manageableRoles },
      },
      orderBy: { name: 'asc' },
    });
  }
}
