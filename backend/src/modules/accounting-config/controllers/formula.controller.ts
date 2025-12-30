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
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { FormulaService, CreateFormulaDto, UpdateFormulaDto } from '../services/formula.service';
import { FormulaContext } from '@/common/formulas/formula-evaluator.service';

// DTOs for Swagger documentation
class ValidateFormulaDto {
  formula: string;
}

class TestFormulaDto {
  formula: string;
  testContext?: Partial<FormulaContext>;
}

class EvaluateFormulaDto {
  context: FormulaContext;
}

class CreateFromTemplateDto {
  templateCode: string;
  customizations?: Partial<CreateFormulaDto>;
}

@ApiTags('Fórmulas de Cálculo')
@ApiBearerAuth()
@Controller('formulas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FormulaController {
  constructor(private readonly formulaService: FormulaService) {}

  // ============================================
  // INFORMACIÓN Y UTILIDADES
  // ============================================

  @Get('variables')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Obtener variables y funciones disponibles para fórmulas' })
  @ApiResponse({ status: 200, description: 'Variables y funciones disponibles' })
  getAvailableVariables() {
    return this.formulaService.getAvailableVariables();
  }

  @Get('templates')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Obtener plantillas de fórmulas comunes' })
  @ApiResponse({ status: 200, description: 'Lista de plantillas' })
  getFormulaTemplates() {
    return this.formulaService.getFormulaTemplates();
  }

  @Post('validate')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Validar una fórmula sin guardarla' })
  @ApiBody({ type: ValidateFormulaDto })
  @ApiResponse({ status: 200, description: 'Resultado de validación' })
  validateFormula(@Body() body: ValidateFormulaDto) {
    return this.formulaService.validateFormula(body.formula);
  }

  @Post('test')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Probar una fórmula con valores de ejemplo' })
  @ApiBody({ type: TestFormulaDto })
  @ApiResponse({ status: 200, description: 'Resultado de prueba' })
  testFormula(@Body() body: TestFormulaDto) {
    return this.formulaService.testFormula(body.formula, body.testContext);
  }

  // ============================================
  // CRUD DE FÓRMULAS POR EMPRESA
  // ============================================

  @Get('company/:companyId')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Listar fórmulas de una empresa' })
  @ApiQuery({ name: 'type', required: false, enum: ['PERCEPTION', 'DEDUCTION'] })
  @ApiResponse({ status: 200, description: 'Lista de fórmulas' })
  async getCompanyFormulas(
    @Param('companyId') companyId: string,
    @Query('type') type?: 'PERCEPTION' | 'DEDUCTION',
  ) {
    return this.formulaService.getCompanyFormulas(companyId, type);
  }

  @Get(':id')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Obtener una fórmula por ID' })
  @ApiResponse({ status: 200, description: 'Fórmula encontrada' })
  @ApiResponse({ status: 404, description: 'Fórmula no encontrada' })
  async getFormulaById(@Param('id') id: string) {
    return this.formulaService.getFormulaById(id);
  }

  @Get('company/:companyId/code/:code')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Obtener fórmula por código de concepto' })
  @ApiResponse({ status: 200, description: 'Fórmula encontrada' })
  async getFormulaByCode(
    @Param('companyId') companyId: string,
    @Param('code') code: string,
  ) {
    return this.formulaService.getFormulaByCode(companyId, code);
  }

  @Post('company/:companyId')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Crear nueva fórmula de cálculo' })
  @ApiResponse({ status: 201, description: 'Fórmula creada' })
  @ApiResponse({ status: 400, description: 'Fórmula inválida' })
  @ApiResponse({ status: 409, description: 'Código de concepto ya existe' })
  async createFormula(
    @Param('companyId') companyId: string,
    @Body() dto: CreateFormulaDto,
    @Request() req: any,
  ) {
    return this.formulaService.createFormula(companyId, dto, req.user.id);
  }

  @Post('company/:companyId/from-template')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Crear fórmula a partir de plantilla' })
  @ApiBody({ type: CreateFromTemplateDto })
  @ApiResponse({ status: 201, description: 'Fórmula creada desde plantilla' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async createFromTemplate(
    @Param('companyId') companyId: string,
    @Body() body: CreateFromTemplateDto,
    @Request() req: any,
  ) {
    return this.formulaService.createFromTemplate(
      companyId,
      body.templateCode,
      req.user.id,
      body.customizations,
    );
  }

  @Patch(':id')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Actualizar una fórmula' })
  @ApiResponse({ status: 200, description: 'Fórmula actualizada' })
  @ApiResponse({ status: 400, description: 'Fórmula inválida' })
  @ApiResponse({ status: 404, description: 'Fórmula no encontrada' })
  async updateFormula(
    @Param('id') id: string,
    @Body() dto: UpdateFormulaDto,
    @Request() req: any,
  ) {
    return this.formulaService.updateFormula(id, dto, req.user.id);
  }

  @Delete(':id')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Eliminar una fórmula' })
  @ApiResponse({ status: 200, description: 'Fórmula eliminada' })
  @ApiResponse({ status: 404, description: 'Fórmula no encontrada' })
  async deleteFormula(@Param('id') id: string, @Request() req: any) {
    return this.formulaService.deleteFormula(id, req.user.id);
  }

  // ============================================
  // EVALUACIÓN DE FÓRMULAS
  // ============================================

  @Post(':id/evaluate')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Evaluar una fórmula con contexto proporcionado' })
  @ApiBody({ type: EvaluateFormulaDto })
  @ApiResponse({ status: 200, description: 'Resultado de la evaluación' })
  @ApiResponse({ status: 400, description: 'Error en la evaluación' })
  async evaluateWithContext(
    @Param('id') id: string,
    @Body() body: EvaluateFormulaDto,
  ) {
    return this.formulaService.evaluateWithContext(id, body.context);
  }

  @Post('company/:companyId/evaluate-all')
  @Roles('admin', 'company_admin', 'hr_manager')
  @ApiOperation({ summary: 'Evaluar todas las fórmulas activas para un empleado' })
  @ApiQuery({ name: 'type', required: false, enum: ['PERCEPTION', 'DEDUCTION'] })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        employee: { type: 'object', description: 'Datos del empleado' },
        period: { type: 'object', description: 'Datos del período' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Resultados de todas las fórmulas' })
  async evaluateAllForEmployee(
    @Param('companyId') companyId: string,
    @Query('type') type: 'PERCEPTION' | 'DEDUCTION' | undefined,
    @Body() body: { employee: any; period: any },
  ) {
    return this.formulaService.evaluateAllForEmployee(
      companyId,
      body.employee,
      body.period,
      type,
    );
  }
}
