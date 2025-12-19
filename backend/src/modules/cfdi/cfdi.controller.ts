import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { CfdiService } from './cfdi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@/common/decorators';

@ApiTags('cfdi')
@Controller('cfdi')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CfdiController {
  constructor(private readonly cfdiService: CfdiService) {}

  @Post('generate/:payrollDetailId')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Generar CFDI de nómina' })
  generate(@Param('payrollDetailId') payrollDetailId: string) {
    return this.cfdiService.generateCfdi(payrollDetailId);
  }

  @Post(':id/stamp')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Timbrar CFDI' })
  stamp(@Param('id') id: string) {
    return this.cfdiService.stampCfdi(id);
  }

  @Post(':id/cancel')
  @Roles('admin')
  @ApiOperation({ summary: 'Cancelar CFDI' })
  cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.cfdiService.cancelCfdi(id, reason);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener CFDI' })
  findOne(@Param('id') id: string) {
    return this.cfdiService.getCfdi(id);
  }

  @Get('period/:periodId')
  @ApiOperation({ summary: 'Obtener CFDIs del período' })
  findByPeriod(@Param('periodId') periodId: string) {
    return this.cfdiService.getCfdisByPeriod(periodId);
  }

  @Post('period/:periodId/stamp-all')
  @Roles('admin')
  @ApiOperation({ summary: 'Timbrar todos los CFDIs del período' })
  stampAll(@Param('periodId') periodId: string) {
    return this.cfdiService.stampAllPeriod(periodId);
  }

  @Get(':id/xml')
  @ApiOperation({ summary: 'Descargar XML del CFDI' })
  async downloadXml(@Param('id') id: string, @Res() res: Response) {
    const cfdi = await this.cfdiService.getCfdi(id);
    const xml = cfdi.xmlTimbrado || cfdi.xmlOriginal;

    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="CFDI_${cfdi.uuid || id}.xml"`,
    });

    res.send(xml);
  }

  @Get('by-detail/:payrollDetailId')
  @ApiOperation({ summary: 'Obtener CFDI por ID de detalle de nómina' })
  findByPayrollDetail(@Param('payrollDetailId') payrollDetailId: string) {
    return this.cfdiService.getCfdiByPayrollDetail(payrollDetailId);
  }

  @Get('by-detail/:payrollDetailId/xml')
  @ApiOperation({ summary: 'Descargar XML del CFDI por detalle de nómina' })
  async downloadXmlByDetail(
    @Param('payrollDetailId') payrollDetailId: string,
    @Res() res: Response,
  ) {
    const cfdi = await this.cfdiService.getCfdiByPayrollDetail(payrollDetailId);

    if (!cfdi) {
      res.status(404).json({ message: 'CFDI no encontrado' });
      return;
    }

    const xml = cfdi.xmlTimbrado || cfdi.xmlOriginal;

    if (!xml) {
      res.status(404).json({ message: 'XML no disponible' });
      return;
    }

    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="CFDI_${cfdi.uuid || payrollDetailId}.xml"`,
    });

    res.send(xml);
  }
}
