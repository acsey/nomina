import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HierarchyService } from './hierarchy.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('hierarchy')
@UseGuards(JwtAuthGuard)
export class HierarchyController {
  constructor(
    private readonly hierarchyService: HierarchyService,
    private readonly prisma: PrismaService,
  ) {}

  // Get full organizational chart
  // Super admin can see all companies, others only see their own company
  @Get('org-chart')
  async getOrganizationalChart(
    @Request() req: any,
    @Query('companyId') companyId?: string,
  ) {
    const user = req.user;

    // Super admin can specify any company or see all
    if (user.role === 'admin') {
      if (companyId) {
        return this.hierarchyService.getOrganizationalChart(companyId);
      }
      // If no companyId specified, return charts for all companies
      const companies = await this.prisma.company.findMany({
        select: { id: true, name: true },
      });

      const results = [];
      for (const company of companies) {
        const chart = await this.hierarchyService.getOrganizationalChart(company.id);
        results.push({
          companyId: company.id,
          companyName: company.name,
          chart,
        });
      }
      return results;
    }

    // Other users can only see their company
    const userCompanyId = companyId || user.companyId;

    if (!userCompanyId) {
      throw new BadRequestException('Usuario no tiene empresa asignada');
    }

    // Validate user can only see their own company
    if (user.companyId && userCompanyId !== user.companyId) {
      throw new ForbiddenException('No tiene permiso para ver otra empresa');
    }

    return this.hierarchyService.getOrganizationalChart(userCompanyId);
  }

  // Get hierarchy chain for an employee (supervisors up to top)
  @Get('employee/:id/chain')
  async getEmployeeHierarchy(
    @Request() req: any,
    @Param('id') employeeId: string,
  ) {
    await this.validateEmployeeAccess(req.user, employeeId);
    return this.hierarchyService.getEmployeeHierarchy(employeeId);
  }

  // Get direct subordinates
  @Get('employee/:id/subordinates')
  async getSubordinates(
    @Request() req: any,
    @Param('id') employeeId: string,
  ) {
    await this.validateEmployeeAccess(req.user, employeeId);
    return this.hierarchyService.getSubordinates(employeeId);
  }

  // Get all subordinates (recursive)
  @Get('employee/:id/all-subordinates')
  async getAllSubordinates(
    @Request() req: any,
    @Param('id') employeeId: string,
  ) {
    await this.validateEmployeeAccess(req.user, employeeId);
    return this.hierarchyService.getAllSubordinates(employeeId);
  }

  // Get who can approve for an employee
  @Get('employee/:id/approvers')
  async getApprovers(
    @Request() req: any,
    @Param('id') employeeId: string,
  ) {
    await this.validateEmployeeAccess(req.user, employeeId);
    return this.hierarchyService.getApprovers(employeeId);
  }

  // Set supervisor for an employee
  @Patch('employee/:id/supervisor')
  async setSupervisor(
    @Request() req: any,
    @Param('id') employeeId: string,
    @Body() body: { supervisorId: string | null },
  ) {
    // Only admin, company_admin, and rh can modify hierarchy
    if (!['admin', 'company_admin', 'rh'].includes(req.user.role)) {
      throw new ForbiddenException('No tiene permiso para modificar la jerarquía');
    }

    await this.validateEmployeeAccess(req.user, employeeId);

    if (body.supervisorId) {
      await this.validateEmployeeAccess(req.user, body.supervisorId);
    }

    return this.hierarchyService.setSupervisor(employeeId, body.supervisorId);
  }

  // Create a delegation
  @Post('delegations')
  async createDelegation(
    @Request() req: any,
    @Body()
    body: {
      delegatorId: string;
      delegateeId: string;
      delegationType: string;
      startDate: string;
      endDate?: string;
      reason?: string;
    },
  ) {
    // Only admin, company_admin, rh, or manager can create delegations
    if (!['admin', 'company_admin', 'rh', 'manager'].includes(req.user.role)) {
      throw new ForbiddenException('No tiene permiso para crear delegaciones');
    }

    // Validate the delegator is the user's employee or user has admin rights
    if (req.user.role !== 'admin' && req.user.employeeId !== body.delegatorId) {
      // Check if user has authority over the delegator
      const canManage = await this.hierarchyService.validateAccess(req.user.id, body.delegatorId);
      if (!canManage) {
        throw new ForbiddenException('No tiene permiso para crear delegaciones para este empleado');
      }
    }

    return this.hierarchyService.createDelegation({
      delegatorId: body.delegatorId,
      delegateeId: body.delegateeId,
      delegationType: body.delegationType,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      reason: body.reason,
    });
  }

  // Get delegations for an employee
  @Get('employee/:id/delegations')
  async getDelegations(
    @Request() req: any,
    @Param('id') employeeId: string,
  ) {
    await this.validateEmployeeAccess(req.user, employeeId);
    return this.hierarchyService.getDelegations(employeeId);
  }

  // Revoke a delegation
  @Delete('delegations/:id')
  async revokeDelegation(
    @Request() req: any,
    @Param('id') delegationId: string,
  ) {
    // Get delegation to check ownership
    const delegation = await this.prisma.approvalDelegation.findUnique({
      where: { id: delegationId },
      include: { delegator: true },
    });

    if (!delegation) {
      throw new BadRequestException('Delegación no encontrada');
    }

    // Only admin, company_admin, rh, or the delegator can revoke
    if (req.user.role !== 'admin') {
      if (req.user.employeeId !== delegation.delegatorId) {
        const canManage = await this.hierarchyService.validateAccess(
          req.user.id,
          delegation.delegatorId,
        );
        if (!canManage) {
          throw new ForbiddenException('No tiene permiso para revocar esta delegación');
        }
      }
    }

    return this.hierarchyService.revokeDelegation(delegationId);
  }

  // Check if an approver can approve
  @Get('can-approve')
  async canApprove(
    @Query('approverId') approverId: string,
    @Query('employeeId') employeeId: string,
  ) {
    const canApprove = await this.hierarchyService.canApprove(
      approverId,
      employeeId,
    );
    return { canApprove };
  }

  // Helper method to validate user can access an employee
  private async validateEmployeeAccess(user: any, employeeId: string): Promise<void> {
    // Super admin can access all
    if (user.role === 'admin') return;

    // Get employee to check company
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });

    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    // User must be from the same company
    if (user.companyId && employee.companyId !== user.companyId) {
      throw new ForbiddenException('No tiene acceso a este empleado');
    }

    // For manager role, validate they have authority over this employee
    if (user.role === 'manager') {
      const hasAccess = await this.hierarchyService.validateAccess(user.id, employeeId);
      if (!hasAccess) {
        throw new ForbiddenException('No tiene acceso a este empleado');
      }
    }
  }
}
