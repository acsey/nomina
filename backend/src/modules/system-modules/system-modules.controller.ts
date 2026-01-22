import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SystemModulesService } from './system-modules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { CreateSystemModuleDto, UpdateSystemModuleDto, UpdateCompanyModuleDto } from './dto';

@ApiTags('System Modules')
@ApiBearerAuth()
@Controller('system-modules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemModulesController {
  constructor(private readonly systemModulesService: SystemModulesService) {}

  // =============================================
  // SYSTEM MODULES (Solo Super Admin)
  // =============================================

  @Get()
  @RequireRoles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Obtener todos los módulos del sistema' })
  findAllSystemModules() {
    return this.systemModulesService.findAllSystemModules();
  }

  @Post('seed')
  @RequireRoles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Inicializar módulos predefinidos del sistema' })
  seedDefaultModules() {
    return this.systemModulesService.seedDefaultModules();
  }

  @Post()
  @RequireRoles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Crear nuevo módulo del sistema' })
  createSystemModule(@Body() dto: CreateSystemModuleDto) {
    return this.systemModulesService.createSystemModule(dto);
  }

  @Patch(':id')
  @RequireRoles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Actualizar módulo del sistema' })
  updateSystemModule(
    @Param('id') id: string,
    @Body() dto: UpdateSystemModuleDto
  ) {
    return this.systemModulesService.updateSystemModule(id, dto);
  }

  @Get(':code/companies')
  @RequireRoles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Obtener empresas con un módulo habilitado' })
  @ApiParam({ name: 'code', description: 'Código del módulo' })
  getCompaniesWithModule(@Param('code') code: string) {
    return this.systemModulesService.getCompaniesWithModule(code);
  }

  // =============================================
  // COMPANY MODULES (Admin de empresa)
  // =============================================

  @Get('company/:companyId')
  @RequireRoles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Obtener módulos de una empresa' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  getCompanyModules(@Param('companyId') companyId: string) {
    return this.systemModulesService.getCompanyModules(companyId);
  }

  @Get('company/:companyId/check/:moduleCode')
  @RequireRoles('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN')
  @ApiOperation({ summary: 'Verificar si un módulo está habilitado' })
  async isModuleEnabled(
    @Param('companyId') companyId: string,
    @Param('moduleCode') moduleCode: string
  ) {
    const isEnabled = await this.systemModulesService.isModuleEnabled(companyId, moduleCode);
    return { moduleCode, isEnabled };
  }

  @Patch('company/:companyId/:moduleCode')
  @RequireRoles('SYSTEM_ADMIN', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Habilitar/deshabilitar módulo para una empresa' })
  updateCompanyModule(
    @Param('companyId') companyId: string,
    @Param('moduleCode') moduleCode: string,
    @Body() dto: UpdateCompanyModuleDto,
    @Request() req: any
  ) {
    return this.systemModulesService.updateCompanyModule(
      companyId,
      moduleCode,
      dto,
      req.user?.id
    );
  }

  @Post('company/:companyId/initialize')
  @RequireRoles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Inicializar módulos para una nueva empresa' })
  initializeCompanyModules(@Param('companyId') companyId: string) {
    return this.systemModulesService.initializeCompanyModules(companyId);
  }
}
