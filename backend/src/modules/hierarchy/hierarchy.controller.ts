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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HierarchyService } from './hierarchy.service';

@Controller('hierarchy')
@UseGuards(JwtAuthGuard)
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  // Get full organizational chart
  @Get('org-chart')
  async getOrganizationalChart(@Query('companyId') companyId?: string) {
    return this.hierarchyService.getOrganizationalChart(companyId);
  }

  // Get hierarchy chain for an employee (supervisors up to top)
  @Get('employee/:id/chain')
  async getEmployeeHierarchy(@Param('id') employeeId: string) {
    return this.hierarchyService.getEmployeeHierarchy(employeeId);
  }

  // Get direct subordinates
  @Get('employee/:id/subordinates')
  async getSubordinates(@Param('id') employeeId: string) {
    return this.hierarchyService.getSubordinates(employeeId);
  }

  // Get all subordinates (recursive)
  @Get('employee/:id/all-subordinates')
  async getAllSubordinates(@Param('id') employeeId: string) {
    return this.hierarchyService.getAllSubordinates(employeeId);
  }

  // Get who can approve for an employee
  @Get('employee/:id/approvers')
  async getApprovers(@Param('id') employeeId: string) {
    return this.hierarchyService.getApprovers(employeeId);
  }

  // Set supervisor for an employee
  @Patch('employee/:id/supervisor')
  async setSupervisor(
    @Param('id') employeeId: string,
    @Body() body: { supervisorId: string | null },
  ) {
    return this.hierarchyService.setSupervisor(employeeId, body.supervisorId);
  }

  // Create a delegation
  @Post('delegations')
  async createDelegation(
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
  async getDelegations(@Param('id') employeeId: string) {
    return this.hierarchyService.getDelegations(employeeId);
  }

  // Revoke a delegation
  @Delete('delegations/:id')
  async revokeDelegation(@Param('id') delegationId: string) {
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
}
