import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { GovernmentService } from './government.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@/common/decorators';

@ApiTags('government')
@Controller('government')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GovernmentController {
  constructor(private readonly governmentService: GovernmentService) {}

  @Get('imss/report')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Reporte de cuotas IMSS' })
  getImssReport(
    @Query('companyId') companyId: string,
    @Query('periodId') periodId: string,
  ) {
    return this.governmentService.getImssReport(companyId, periodId);
  }

  @Get('imss/employer-quotas')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Cuotas patronales IMSS' })
  getImssEmployerQuotas(
    @Query('companyId') companyId: string,
    @Query('periodId') periodId: string,
  ) {
    return this.governmentService.getImssEmployerQuotas(companyId, periodId);
  }

  @Get('imss/sua-file')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Generar archivo SUA' })
  async getSuaFile(
    @Query('companyId') companyId: string,
    @Query('periodId') periodId: string,
    @Res() res: Response,
  ) {
    const file = await this.governmentService.getSuaFile(companyId, periodId);

    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="SUA_${periodId}.txt"`,
    });

    res.send(file);
  }

  @Get('imss/idse-movements')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Movimientos IDSE' })
  getIdseMovements(
    @Query('companyId') companyId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.governmentService.getIdseMovements(companyId, month, year);
  }

  @Post('imss/movement')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Registrar movimiento IMSS' })
  registerImssMovement(@Body() movementDto: any) {
    return this.governmentService.registerImssMovement(movementDto);
  }

  @Get('issste/report')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Reporte de cuotas ISSSTE' })
  getIssstReport(
    @Query('companyId') companyId: string,
    @Query('periodId') periodId: string,
  ) {
    return this.governmentService.getIssstReport(companyId, periodId);
  }

  @Get('infonavit/report')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Reporte de descuentos INFONAVIT' })
  getInfonavitReport(
    @Query('companyId') companyId: string,
    @Query('periodId') periodId: string,
  ) {
    return this.governmentService.getInfonavitReport(companyId, periodId);
  }
}
