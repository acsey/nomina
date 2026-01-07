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
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser, normalizeRole } from '@/common/decorators';
import { RoleName } from '@/common/constants/roles';
import { PrismaService } from '@/common/prisma/prisma.service';

// Helper to check if user is super admin
function isSuperAdmin(user: { role: string; companyId?: string | null }): boolean {
  const normalizedRole = normalizeRole(user.role);
  return normalizedRole === RoleName.SYSTEM_ADMIN && !user.companyId;
}

@ApiTags('employees')
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(RoleName.SYSTEM_ADMIN, RoleName.COMPANY_ADMIN, RoleName.HR_ADMIN, 'admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Crear nuevo empleado' })
  async create(
    @CurrentUser() user: any,
    @Body() createEmployeeDto: CreateEmployeeDto,
  ) {
    // Validate user can create employees for this company
    if (!isSuperAdmin(user)) {
      // User must create employees for their own company only
      if (createEmployeeDto.companyId !== user.companyId) {
        throw new ForbiddenException('No puede crear empleados para otra empresa');
      }
    }

    // Validate supervisor belongs to the same company
    if (createEmployeeDto.supervisorId) {
      const supervisor = await this.prisma.employee.findUnique({
        where: { id: createEmployeeDto.supervisorId },
        select: { companyId: true },
      });

      if (!supervisor || supervisor.companyId !== createEmployeeDto.companyId) {
        throw new BadRequestException('El supervisor debe pertenecer a la misma empresa');
      }
    }

    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar empleados' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @Query('companyId') companyIdQuery?: string,
  ) {
    // Only super admin (without companyId) can see all companies
    const isSuper = isSuperAdmin(user);

    // Super admin can filter by any company, others see only their company
    let companyId: string | undefined;

    if (isSuper) {
      // Super admin can specify any company or see all
      companyId = companyIdQuery;
    } else {
      // CRITICAL: Force the user's company - ignore any query parameter
      companyId = user.companyId;
    }

    return this.employeesService.findAll({
      skip,
      take,
      search,
      departmentId,
      status,
      companyId,
    });
  }

  @Get('by-email/:email')
  @ApiOperation({ summary: 'Obtener empleado por email' })
  async findByEmail(
    @CurrentUser() user: any,
    @Param('email') email: string,
  ) {
    const employee = await this.employeesService.findByEmail(email);

    // Validate access
    await this.validateEmployeeAccess(user, employee.companyId);

    return employee;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener empleado por ID' })
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const employee = await this.employeesService.findOne(id);

    // Validate access
    await this.validateEmployeeAccess(user, employee.companyId);

    return employee;
  }

  @Patch(':id')
  @Roles(RoleName.SYSTEM_ADMIN, RoleName.COMPANY_ADMIN, RoleName.HR_ADMIN, 'admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Actualizar empleado' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    // Get employee to check company
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { companyId: true },
    });

    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    // Validate access
    await this.validateEmployeeAccess(user, employee.companyId);

    // Validate supervisor belongs to the same company if changing
    if (updateEmployeeDto.supervisorId) {
      const supervisor = await this.prisma.employee.findUnique({
        where: { id: updateEmployeeDto.supervisorId },
        select: { companyId: true },
      });

      if (!supervisor || supervisor.companyId !== employee.companyId) {
        throw new BadRequestException('El supervisor debe pertenecer a la misma empresa');
      }
    }

    // Prevent changing employee's company (unless super admin)
    if (updateEmployeeDto.companyId && updateEmployeeDto.companyId !== employee.companyId && !isSuperAdmin(user)) {
      throw new ForbiddenException('No puede cambiar la empresa del empleado');
    }

    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @Roles(RoleName.SYSTEM_ADMIN, RoleName.COMPANY_ADMIN, 'admin', 'company_admin')
  @ApiOperation({ summary: 'Desactivar empleado' })
  async remove(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    // Get employee to check company
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { companyId: true },
    });

    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    // Validate access
    await this.validateEmployeeAccess(user, employee.companyId);

    return this.employeesService.remove(id);
  }

  @Post(':id/terminate')
  @Roles(RoleName.SYSTEM_ADMIN, RoleName.COMPANY_ADMIN, RoleName.HR_ADMIN, 'admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Dar de baja a empleado' })
  async terminate(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('terminationDate') terminationDate: Date,
  ) {
    // Get employee to check company
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { companyId: true },
    });

    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    // Validate access
    await this.validateEmployeeAccess(user, employee.companyId);

    return this.employeesService.terminate(id, terminationDate);
  }

  @Post(':id/salary')
  @Roles(RoleName.SYSTEM_ADMIN, RoleName.COMPANY_ADMIN, RoleName.HR_ADMIN, 'admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Actualizar salario del empleado' })
  async updateSalary(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('newSalary') newSalary: number,
    @Body('reason') reason?: string,
  ) {
    // Get employee to check company
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { companyId: true },
    });

    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    // Validate access
    await this.validateEmployeeAccess(user, employee.companyId);

    return this.employeesService.updateSalary(id, newSalary, reason);
  }

  // Helper method to validate user can access an employee's company
  private async validateEmployeeAccess(user: any, employeeCompanyId: string): Promise<void> {
    // Super admin can access all
    if (isSuperAdmin(user)) return;

    // User must be from the same company
    if (user.companyId !== employeeCompanyId) {
      throw new ForbiddenException('No tiene acceso a empleados de otra empresa');
    }
  }
}
