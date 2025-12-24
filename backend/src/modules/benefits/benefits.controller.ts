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
import { BenefitsService } from './benefits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '@/common/decorators';

@ApiTags('benefits')
@Controller('benefits')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BenefitsController {
  constructor(private readonly benefitsService: BenefitsService) {}

  @Post()
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Crear prestación' })
  create(
    @Body() createBenefitDto: any,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.benefitsService.createBenefit({
      ...createBenefitDto,
      createdById: userId,
      isAdmin: role === 'admin',
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar prestaciones' })
  findAll(@Query('includeAll') includeAll?: string) {
    return this.benefitsService.findAllBenefits(includeAll === 'true');
  }

  @Get('pending')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Listar prestaciones pendientes de aprobación' })
  findPending() {
    return this.benefitsService.findPendingBenefits();
  }

  @Post(':id/approve')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Aprobar prestación' })
  approve(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.benefitsService.approveBenefit(id, userId);
  }

  @Post(':id/reject')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Rechazar prestación' })
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.benefitsService.rejectBenefit(id, reason);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener prestación' })
  findOne(@Param('id') id: string) {
    return this.benefitsService.findBenefit(id);
  }

  @Patch(':id')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Actualizar prestación' })
  update(@Param('id') id: string, @Body() updateBenefitDto: any) {
    return this.benefitsService.updateBenefit(id, updateBenefitDto);
  }

  @Delete(':id')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Eliminar prestación' })
  remove(@Param('id') id: string) {
    return this.benefitsService.deleteBenefit(id);
  }

  @Post('assign')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Asignar prestación a empleado' })
  assignToEmployee(@Body() assignDto: any) {
    return this.benefitsService.assignBenefitToEmployee(assignDto);
  }

  @Delete('employee/:employeeId/benefit/:benefitId')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Remover prestación de empleado' })
  removeFromEmployee(
    @Param('employeeId') employeeId: string,
    @Param('benefitId') benefitId: string,
  ) {
    return this.benefitsService.removeEmployeeBenefit(employeeId, benefitId);
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Obtener prestaciones del empleado' })
  getEmployeeBenefits(@Param('employeeId') employeeId: string) {
    return this.benefitsService.getEmployeeBenefits(employeeId);
  }
}
