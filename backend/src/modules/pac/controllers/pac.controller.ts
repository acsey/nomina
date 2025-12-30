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
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { PacService } from '../services/pac.service';
import {
  CreatePacProviderDto,
  UpdatePacProviderDto,
  ConfigurePacDto,
  UpdatePacConfigDto,
} from '../dto/pac.dto';

@ApiTags('PAC - Proveedores Autorizados de Certificación')
@ApiBearerAuth()
@Controller('pac')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PacController {
  constructor(private readonly pacService: PacService) {}

  // ============================================
  // CATÁLOGO DE PACs
  // ============================================

  @Get('providers')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Lista todos los PACs del catálogo' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de PACs' })
  async getAllProviders(@Query('includeInactive') includeInactive?: string) {
    return this.pacService.getAllProviders(includeInactive === 'true');
  }

  @Get('providers/featured')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Lista PACs destacados/recomendados' })
  @ApiResponse({ status: 200, description: 'Lista de PACs destacados' })
  async getFeaturedProviders() {
    return this.pacService.getFeaturedProviders();
  }

  @Get('providers/implemented')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Lista PACs con implementación disponible' })
  @ApiResponse({ status: 200, description: 'Lista de PACs implementados' })
  async getImplementedProviders() {
    return this.pacService.getImplementedProviders();
  }

  @Get('providers/:id')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Obtiene detalles de un PAC' })
  @ApiResponse({ status: 200, description: 'Detalles del PAC' })
  @ApiResponse({ status: 404, description: 'PAC no encontrado' })
  async getProviderById(@Param('id') id: string) {
    return this.pacService.getProviderById(id);
  }

  @Get('providers/code/:code')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Obtiene un PAC por código' })
  @ApiResponse({ status: 200, description: 'Detalles del PAC' })
  @ApiResponse({ status: 404, description: 'PAC no encontrado' })
  async getProviderByCode(@Param('code') code: string) {
    return this.pacService.getProviderByCode(code);
  }

  @Post('providers')
  @Roles('admin')
  @ApiOperation({ summary: 'Crea un nuevo PAC personalizado' })
  @ApiResponse({ status: 201, description: 'PAC creado' })
  @ApiResponse({ status: 409, description: 'El código ya existe' })
  async createProvider(
    @Body() dto: CreatePacProviderDto,
    @Request() req: any,
  ) {
    return this.pacService.createProvider(dto, req.user.id);
  }

  @Patch('providers/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualiza un PAC' })
  @ApiResponse({ status: 200, description: 'PAC actualizado' })
  @ApiResponse({ status: 404, description: 'PAC no encontrado' })
  async updateProvider(
    @Param('id') id: string,
    @Body() dto: UpdatePacProviderDto,
    @Request() req: any,
  ) {
    return this.pacService.updateProvider(id, dto, req.user.id);
  }

  @Delete('providers/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Elimina un PAC personalizado' })
  @ApiResponse({ status: 200, description: 'PAC eliminado' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar PAC oficial o con configuraciones' })
  @ApiResponse({ status: 404, description: 'PAC no encontrado' })
  async deleteProvider(@Param('id') id: string, @Request() req: any) {
    return this.pacService.deleteProvider(id, req.user.id);
  }

  // ============================================
  // CONFIGURACIÓN DE PAC POR EMPRESA
  // ============================================

  @Get('config/company/:companyId')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Lista configuraciones de PAC de una empresa' })
  @ApiResponse({ status: 200, description: 'Lista de configuraciones' })
  async getCompanyConfigs(@Param('companyId') companyId: string) {
    return this.pacService.getCompanyConfigs(companyId);
  }

  @Get('config/company/:companyId/primary')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Obtiene la configuración principal de PAC' })
  @ApiResponse({ status: 200, description: 'Configuración principal' })
  async getPrimaryConfig(@Param('companyId') companyId: string) {
    return this.pacService.getPrimaryConfig(companyId);
  }

  @Post('config/company/:companyId')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Configura un PAC para la empresa' })
  @ApiResponse({ status: 201, description: 'PAC configurado' })
  @ApiResponse({ status: 400, description: 'Campos requeridos faltantes' })
  @ApiResponse({ status: 404, description: 'Empresa o PAC no encontrado' })
  async configurePac(
    @Param('companyId') companyId: string,
    @Body() dto: ConfigurePacDto,
    @Request() req: any,
  ) {
    return this.pacService.configurePac(companyId, dto, req.user.id);
  }

  @Patch('config/:configId')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Actualiza configuración de PAC' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async updatePacConfig(
    @Param('configId') configId: string,
    @Body() dto: UpdatePacConfigDto,
    @Request() req: any,
  ) {
    return this.pacService.updatePacConfig(configId, dto, req.user.id);
  }

  @Delete('config/:configId')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Elimina configuración de PAC' })
  @ApiResponse({ status: 200, description: 'Configuración eliminada' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async deletePacConfig(
    @Param('configId') configId: string,
    @Request() req: any,
  ) {
    return this.pacService.deletePacConfig(configId, req.user.id);
  }

  @Post('config/:configId/test')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Prueba conexión con el PAC' })
  @ApiResponse({ status: 200, description: 'Resultado de la prueba' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async testConnection(
    @Param('configId') configId: string,
    @Request() req: any,
  ) {
    return this.pacService.testConnection(configId, req.user.id);
  }

  @Post('config/company/:companyId/set-primary/:configId')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Establece PAC como principal' })
  @ApiResponse({ status: 200, description: 'PAC establecido como principal' })
  @ApiResponse({ status: 400, description: 'Configuración no pertenece a la empresa' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async setPrimaryPac(
    @Param('companyId') companyId: string,
    @Param('configId') configId: string,
    @Request() req: any,
  ) {
    return this.pacService.setPrimaryPac(companyId, configId, req.user.id);
  }
}
