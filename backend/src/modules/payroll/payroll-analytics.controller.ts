import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PayrollSimulationService, SimulationEmployeeInput, SimulationPeriodInput } from './services/payroll-simulation.service';
import { PayrollAnalyticsService } from './services/payroll-analytics.service';

@ApiTags('Payroll Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll/analytics')
export class PayrollAnalyticsController {
  constructor(
    private readonly simulationService: PayrollSimulationService,
    private readonly analyticsService: PayrollAnalyticsService,
  ) {}

  // ===== SIMULACIÓN =====

  @Post('simulate/employee')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({
    summary: 'Simular nómina para un empleado',
    description: 'Calcula la nómina para un empleado sin persistir datos. Útil para proyecciones y escenarios "what-if".',
  })
  @ApiResponse({ status: 200, description: 'Resultado de la simulación' })
  async simulateEmployee(
    @Body() input: SimulationEmployeeInput,
    @Query('periodType') periodType: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' = 'BIWEEKLY',
    @Query('year') year?: number,
  ) {
    return this.simulationService.simulateForEmployee(
      input,
      periodType,
      year || new Date().getFullYear(),
    );
  }

  @Post('simulate/period')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({
    summary: 'Simular nómina para un período completo',
    description: 'Proyecta el costo de nómina para toda la empresa o departamentos específicos.',
  })
  @ApiResponse({ status: 200, description: 'Resultado de la simulación del período' })
  async simulatePeriod(@Body() input: SimulationPeriodInput) {
    return this.simulationService.simulatePeriod(input);
  }

  @Post('simulate/scenarios')
  @Roles('admin', 'company_admin')
  @ApiOperation({
    summary: 'Comparar escenarios de nómina',
    description: 'Compara múltiples escenarios hipotéticos (ej: aumento salarial del 5% vs 10%).',
  })
  @ApiResponse({ status: 200, description: 'Comparación de escenarios' })
  async compareScenarios(
    @Body() body: {
      baseInput: SimulationPeriodInput;
      scenarios: { name: string; adjustments: Partial<SimulationPeriodInput> }[];
    },
  ) {
    return this.simulationService.compareScenarios(body.baseInput, body.scenarios);
  }

  // ===== COMPARATIVOS =====

  @Get('compare/:period1Id/:period2Id')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({
    summary: 'Comparar dos períodos de nómina',
    description: 'Genera un comparativo detallado entre dos períodos de nómina.',
  })
  @ApiResponse({ status: 200, description: 'Comparativo entre períodos' })
  async comparePeriods(
    @Param('period1Id') period1Id: string,
    @Param('period2Id') period2Id: string,
  ) {
    return this.analyticsService.comparePeriods(period1Id, period2Id);
  }

  // ===== DASHBOARD =====

  @Get('dashboard/:companyId')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({
    summary: 'Dashboard ejecutivo de nómina',
    description: 'Obtiene el dashboard con KPIs, tendencias y alertas de nómina.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard ejecutivo' })
  async getExecutiveDashboard(@Param('companyId') companyId: string) {
    return this.analyticsService.getExecutiveDashboard(companyId);
  }

  @Get('dashboard')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({
    summary: 'Dashboard ejecutivo de la empresa del usuario',
    description: 'Obtiene el dashboard para la empresa del usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard ejecutivo' })
  async getMyDashboard(@CurrentUser() user: any) {
    if (!user.companyId) {
      // Super admin: retornar dashboard vacío o agregar parámetro
      return { error: 'Especifique companyId para super admin' };
    }
    return this.analyticsService.getExecutiveDashboard(user.companyId);
  }

  // ===== VISTAS POR EXCEPCIÓN =====

  @Get('exceptions/:companyId')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({
    summary: 'Vistas por excepción',
    description: 'Obtiene todas las excepciones y alertas que requieren atención.',
  })
  @ApiResponse({ status: 200, description: 'Lista de excepciones' })
  async getExceptionViews(@Param('companyId') companyId: string) {
    return this.analyticsService.getExceptionViews(companyId);
  }

  @Get('exceptions')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({
    summary: 'Vistas por excepción de la empresa del usuario',
    description: 'Obtiene excepciones para la empresa del usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Lista de excepciones' })
  async getMyExceptions(@CurrentUser() user: any) {
    if (!user.companyId) {
      return { error: 'Especifique companyId para super admin' };
    }
    return this.analyticsService.getExceptionViews(user.companyId);
  }
}
