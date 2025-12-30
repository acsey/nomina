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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CompanyConceptService } from '../services/company-concept.service';
import {
  CreatePayrollConceptDto,
  UpdatePayrollConceptDto,
  CreateCompanyConceptDto,
  UpdateCompanyConceptDto,
  CreateIncidentMappingDto,
  UpdateIncidentMappingDto,
  CreateCustomConceptDto,
} from '../dto/company-concept.dto';

@ApiTags('Conceptos de Nómina')
@ApiBearerAuth()
@Controller('payroll-concepts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyConceptController {
  constructor(private readonly conceptService: CompanyConceptService) {}

  // ============================================
  // CONCEPTOS GLOBALES (Admin)
  // ============================================

  @Get()
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Listar todos los conceptos globales de nómina' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de conceptos' })
  async getAllConcepts(@Query('includeInactive') includeInactive?: string) {
    return this.conceptService.getAllConcepts(includeInactive === 'true');
  }

  @Get(':id')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Obtener un concepto global por ID' })
  @ApiResponse({ status: 200, description: 'Concepto encontrado' })
  @ApiResponse({ status: 404, description: 'Concepto no encontrado' })
  async getConceptById(@Param('id') id: string) {
    return this.conceptService.getConceptById(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear nuevo concepto global (Solo Admin)' })
  @ApiResponse({ status: 201, description: 'Concepto creado' })
  @ApiResponse({ status: 409, description: 'Código ya existe' })
  async createConcept(@Body() dto: CreatePayrollConceptDto, @Request() req: any) {
    return this.conceptService.createConcept(dto, req.user.id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar concepto global (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Concepto actualizado' })
  @ApiResponse({ status: 404, description: 'Concepto no encontrado' })
  async updateConcept(
    @Param('id') id: string,
    @Body() dto: UpdatePayrollConceptDto,
    @Request() req: any,
  ) {
    return this.conceptService.updateConcept(id, dto, req.user.id);
  }

  // ============================================
  // CONFIGURACIÓN POR EMPRESA
  // ============================================

  @Get('company/:companyId')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Listar conceptos configurados para una empresa' })
  @ApiQuery({ name: 'type', required: false, enum: ['PERCEPTION', 'DEDUCTION'] })
  @ApiResponse({ status: 200, description: 'Lista de conceptos de la empresa' })
  async getCompanyConcepts(
    @Param('companyId') companyId: string,
    @Query('type') type?: 'PERCEPTION' | 'DEDUCTION',
  ) {
    return this.conceptService.getCompanyConcepts(companyId, type);
  }

  @Get('company/:companyId/perceptions')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Listar percepciones de una empresa' })
  @ApiResponse({ status: 200, description: 'Lista de percepciones' })
  async getCompanyPerceptions(@Param('companyId') companyId: string) {
    return this.conceptService.getCompanyPerceptions(companyId);
  }

  @Get('company/:companyId/deductions')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Listar deducciones de una empresa' })
  @ApiResponse({ status: 200, description: 'Lista de deducciones' })
  async getCompanyDeductions(@Param('companyId') companyId: string) {
    return this.conceptService.getCompanyDeductions(companyId);
  }

  @Post('company/:companyId')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Configurar concepto para una empresa' })
  @ApiResponse({ status: 201, description: 'Configuración creada/actualizada' })
  async upsertCompanyConcept(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCompanyConceptDto,
    @Request() req: any,
  ) {
    return this.conceptService.upsertCompanyConcept(companyId, dto, req.user.id);
  }

  @Patch('company/:companyId/concept/:conceptId')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Actualizar configuración de concepto para empresa' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async updateCompanyConcept(
    @Param('companyId') companyId: string,
    @Param('conceptId') conceptId: string,
    @Body() dto: UpdateCompanyConceptDto,
    @Request() req: any,
  ) {
    return this.conceptService.updateCompanyConcept(companyId, conceptId, dto, req.user.id);
  }

  @Delete('company/:companyId/concept/:conceptId')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Eliminar configuración personalizada (vuelve a global)' })
  @ApiResponse({ status: 200, description: 'Configuración eliminada' })
  async deleteCompanyConcept(
    @Param('companyId') companyId: string,
    @Param('conceptId') conceptId: string,
    @Request() req: any,
  ) {
    return this.conceptService.deleteCompanyConcept(companyId, conceptId, req.user.id);
  }

  @Post('company/:companyId/custom')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Crear concepto personalizado para empresa' })
  @ApiResponse({ status: 201, description: 'Concepto personalizado creado' })
  @ApiResponse({ status: 409, description: 'Código ya existe' })
  async createCustomConcept(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCustomConceptDto,
    @Request() req: any,
  ) {
    return this.conceptService.createCustomConcept(companyId, dto, req.user.id);
  }

  @Get('company/:companyId/stats')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Estadísticas de uso de conceptos' })
  @ApiResponse({ status: 200, description: 'Estadísticas de conceptos' })
  async getConceptUsageStats(@Param('companyId') companyId: string) {
    return this.conceptService.getConceptUsageStats(companyId);
  }

  // ============================================
  // MAPEO DE INCIDENCIAS
  // ============================================

  @Get('mappings/global')
  @Roles('admin')
  @ApiOperation({ summary: 'Listar mapeos globales de incidencias (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Lista de mapeos globales' })
  async getGlobalIncidentMappings() {
    return this.conceptService.getGlobalIncidentMappings();
  }

  @Get('mappings/company/:companyId')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Listar mapeos de incidencias de una empresa' })
  @ApiResponse({ status: 200, description: 'Lista de mapeos de empresa' })
  async getCompanyIncidentMappings(@Param('companyId') companyId: string) {
    return this.conceptService.getIncidentMappings(companyId);
  }

  @Post('mappings/global')
  @Roles('admin')
  @ApiOperation({ summary: 'Crear mapeo global de incidencia (Solo Admin)' })
  @ApiResponse({ status: 201, description: 'Mapeo creado' })
  async createGlobalIncidentMapping(
    @Body() dto: CreateIncidentMappingDto,
    @Request() req: any,
  ) {
    return this.conceptService.createIncidentMapping(null, dto, req.user.id);
  }

  @Post('mappings/company/:companyId')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Crear mapeo de incidencia para empresa' })
  @ApiResponse({ status: 201, description: 'Mapeo creado' })
  async createCompanyIncidentMapping(
    @Param('companyId') companyId: string,
    @Body() dto: CreateIncidentMappingDto,
    @Request() req: any,
  ) {
    return this.conceptService.createIncidentMapping(companyId, dto, req.user.id);
  }

  @Patch('mappings/:mappingId')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Actualizar mapeo de incidencia' })
  @ApiResponse({ status: 200, description: 'Mapeo actualizado' })
  async updateIncidentMapping(
    @Param('mappingId') mappingId: string,
    @Body() dto: UpdateIncidentMappingDto,
    @Request() req: any,
  ) {
    return this.conceptService.updateIncidentMapping(mappingId, dto, req.user.id);
  }

  @Delete('mappings/:mappingId')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Eliminar mapeo de incidencia' })
  @ApiResponse({ status: 200, description: 'Mapeo eliminado' })
  async deleteIncidentMapping(
    @Param('mappingId') mappingId: string,
    @Request() req: any,
  ) {
    return this.conceptService.deleteIncidentMapping(mappingId, req.user.id);
  }
}
