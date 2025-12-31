/**
 * Controlador de Funciones Gubernamentales
 * Endpoints para auditoría, integridad y exportación
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { StateTransitionService } from './state-transition.service';
import { SnapshotIntegrityService } from './snapshot-integrity.service';
import { AuditExportService, ExportOptions } from './audit-export.service';

@ApiTags('Gobierno')
@Controller('government')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GovernmentController {
  constructor(
    private readonly transitionService: StateTransitionService,
    private readonly integrityService: SnapshotIntegrityService,
    private readonly exportService: AuditExportService,
  ) {}

  // =====================
  // TRANSICIONES DE ESTADO
  // =====================

  @Get('transitions/rules')
  @ApiOperation({ summary: 'Obtiene reglas de transición de estado' })
  @ApiQuery({ name: 'entityType', required: false })
  async getTransitionRules(@Query('entityType') entityType?: string) {
    return this.transitionService.getTransitionRules(entityType as any);
  }

  @Get('transitions/history/:entityType/:entityId')
  @ApiOperation({ summary: 'Obtiene historial de transiciones de una entidad' })
  async getTransitionHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('includeInvalid') includeInvalid?: boolean,
  ) {
    return this.transitionService.getTransitionHistory(entityType as any, entityId, {
      includeInvalid: includeInvalid === true,
    });
  }

  @Get('transitions/pending')
  @ApiOperation({ summary: 'Obtiene acciones pendientes de confirmación' })
  async getPendingActions(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.transitionService.getPendingActions(entityType, entityId);
  }

  @Post('transitions/confirm/:actionId')
  @ApiOperation({ summary: 'Confirma una acción pendiente (doble control)' })
  async confirmAction(@Param('actionId') actionId: string, @Request() req: any) {
    return this.transitionService.confirmPendingAction(
      actionId,
      req.user.id,
      req.user.email,
    );
  }

  @Post('transitions/reject/:actionId')
  @ApiOperation({ summary: 'Rechaza una acción pendiente' })
  async rejectAction(
    @Param('actionId') actionId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    await this.transitionService.rejectPendingAction(actionId, req.user.id, reason);
    return { success: true };
  }

  // =====================
  // INTEGRIDAD DE SNAPSHOTS
  // =====================

  @Get('integrity/stats')
  @ApiOperation({ summary: 'Obtiene estadísticas de integridad de snapshots' })
  async getIntegrityStats() {
    return this.integrityService.getIntegrityStats();
  }

  @Get('integrity/alerts')
  @ApiOperation({ summary: 'Obtiene alertas de integridad pendientes' })
  async getIntegrityAlerts() {
    return this.integrityService.getPendingAlerts();
  }

  @Post('integrity/verify/:snapshotId')
  @ApiOperation({ summary: 'Verifica integridad de un snapshot específico' })
  async verifySnapshot(@Param('snapshotId') snapshotId: string, @Request() req: any) {
    return this.integrityService.verifySnapshot(snapshotId, req.user.id);
  }

  @Post('integrity/verify-period/:periodId')
  @ApiOperation({ summary: 'Verifica integridad de todos los snapshots de un período' })
  async verifyPeriodSnapshots(@Param('periodId') periodId: string, @Request() req: any) {
    return this.integrityService.verifyPeriodSnapshots(periodId, req.user.id);
  }

  @Post('integrity/generate-hashes')
  @ApiOperation({ summary: 'Genera hashes para snapshots pendientes' })
  async generateMissingHashes() {
    const count = await this.integrityService.generateMissingHashes();
    return { generated: count };
  }

  @Post('integrity/resolve-alert/:alertId')
  @ApiOperation({ summary: 'Marca una alerta de integridad como resuelta' })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    await this.integrityService.resolveAlert(alertId, req.user.id, notes);
    return { success: true };
  }

  // =====================
  // EXPORTACIÓN PARA AUDITORÍA
  // =====================

  @Get('export/fiscal-audit')
  @ApiOperation({ summary: 'Exporta auditoría fiscal' })
  @ApiQuery({ name: 'format', enum: ['csv', 'xlsx', 'json'], required: false })
  @ApiQuery({ name: 'periodId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async exportFiscalAudit(
    @Query('companyId') companyId: string,
    @Query('format') format: 'csv' | 'xlsx' | 'json' = 'xlsx',
    @Query('periodId') periodId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const options: ExportOptions = {
      format,
      companyId,
      periodId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const result = await this.exportService.exportFiscalAudit(options);
    return this.sendExportResponse(res!, result);
  }

  @Get('export/receipts')
  @ApiOperation({ summary: 'Exporta recibos de nómina' })
  async exportReceipts(
    @Query('companyId') companyId: string,
    @Query('format') format: 'csv' | 'xlsx' | 'json' = 'xlsx',
    @Query('periodId') periodId?: string,
    @Query('includeVersions') includeVersions?: boolean,
    @Query('includeSnapshots') includeSnapshots?: boolean,
    @Res() res?: Response,
  ) {
    const options: ExportOptions = {
      format,
      companyId,
      periodId,
      includeVersions: includeVersions === true,
      includeSnapshots: includeSnapshots === true,
    };

    const result = await this.exportService.exportReceipts(options);
    return this.sendExportResponse(res!, result);
  }

  @Get('export/snapshots')
  @ApiOperation({ summary: 'Exporta snapshots de reglas fiscales' })
  async exportSnapshots(
    @Query('companyId') companyId: string,
    @Query('format') format: 'csv' | 'xlsx' | 'json' = 'xlsx',
    @Query('periodId') periodId?: string,
    @Res() res?: Response,
  ) {
    const options: ExportOptions = {
      format,
      companyId,
      periodId,
    };

    const result = await this.exportService.exportRulesetSnapshots(options);
    return this.sendExportResponse(res!, result);
  }

  @Get('export/critical-actions')
  @ApiOperation({ summary: 'Exporta log de acciones críticas' })
  async exportCriticalActions(
    @Query('companyId') companyId: string,
    @Query('format') format: 'csv' | 'xlsx' | 'json' = 'xlsx',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const options: ExportOptions = {
      format,
      companyId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const result = await this.exportService.exportCriticalActions(options);
    return this.sendExportResponse(res!, result);
  }

  @Get('export/state-transitions')
  @ApiOperation({ summary: 'Exporta log de transiciones de estado' })
  async exportTransitions(
    @Query('companyId') companyId: string,
    @Query('format') format: 'csv' | 'xlsx' | 'json' = 'xlsx',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const options: ExportOptions = {
      format,
      companyId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const result = await this.exportService.exportStateTransitions(options);
    return this.sendExportResponse(res!, result);
  }

  @Get('export/period-report/:periodId')
  @ApiOperation({ summary: 'Exporta reporte consolidado de un período' })
  async exportPeriodReport(@Param('periodId') periodId: string, @Res() res: Response) {
    const result = await this.exportService.exportPeriodReport(periodId);
    return this.sendExportResponse(res, result);
  }

  /**
   * Helper para enviar respuesta de exportación
   */
  private sendExportResponse(
    res: Response,
    result: { fileName: string; mimeType: string; data: Buffer | string; recordCount: number },
  ) {
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('X-Record-Count', result.recordCount.toString());

    if (Buffer.isBuffer(result.data)) {
      res.send(result.data);
    } else {
      res.send(result.data);
    }
  }
}
