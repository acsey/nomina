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
  Res,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { PayrollReceiptService } from './services/payroll-receipt.service';
import { PayrollVersioningService } from './services/payroll-versioning.service';
import { RulesetSnapshotService } from './services/ruleset-snapshot.service';
import { StampingAuthorizationService, AuthorizationDetails } from './services/stamping-authorization.service';
import { DocumentStorageService, FiscalDocumentType } from './services/document-storage.service';
import { FiscalAuditService } from '@/common/fiscal/fiscal-audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles, Permissions } from '@/common/decorators';
import { PAYROLL_PERMISSIONS, FISCAL_DOCUMENT_PERMISSIONS } from '@/common/constants/permissions';

@ApiTags('payroll')
@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly receiptService: PayrollReceiptService,
    private readonly versioningService: PayrollVersioningService,
    private readonly snapshotService: RulesetSnapshotService,
    private readonly authorizationService: StampingAuthorizationService,
    private readonly documentService: DocumentStorageService,
    private readonly fiscalAuditService: FiscalAuditService,
  ) {}

  @Post('periods')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Crear periodo de nomina' })
  createPeriod(@Body() createPeriodDto: any) {
    return this.payrollService.createPeriod(createPeriodDto);
  }

  @Get('periods')
  @ApiOperation({ summary: 'Listar periodos de nomina' })
  findAllPeriods(
    @Query('companyId') companyId: string,
    @Query('year') year?: number,
  ) {
    return this.payrollService.findAllPeriods(companyId, year);
  }

  @Get('periods/:id')
  @ApiOperation({ summary: 'Obtener periodo de nomina' })
  findPeriod(@Param('id') id: string) {
    return this.payrollService.findPeriod(id);
  }

  @Patch('periods/:id')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Actualizar periodo de nomina (solo en estado borrador)' })
  updatePeriod(@Param('id') id: string, @Body() updateDto: any) {
    return this.payrollService.updatePeriod(id, updateDto);
  }

  @Delete('periods/:id')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Eliminar periodo de nomina (solo en estado borrador)' })
  deletePeriod(@Param('id') id: string) {
    return this.payrollService.deletePeriod(id);
  }

  @Get('periods/:id/preview')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Previsualizar calculo de nomina sin guardar' })
  previewPayroll(@Param('id') id: string) {
    return this.payrollService.previewPayroll(id);
  }

  @Post('periods/:id/calculate')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Calcular nomina del periodo' })
  calculatePayroll(@Param('id') id: string) {
    return this.payrollService.calculatePayroll(id);
  }

  @Post('periods/:id/approve')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Aprobar nomina del periodo (genera y timbra CFDI automaticamente)' })
  approvePayroll(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.id;
    return this.payrollService.approvePayroll(id, userId);
  }

  @Get('periods/:id/stamping-status')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Obtener estado del timbrado del periodo (para polling en modo async)' })
  getStampingStatus(@Param('id') id: string) {
    return this.payrollService.getStampingStatus(id);
  }

  @Post('periods/:id/close')
  @Roles('admin', 'company_admin')
  @ApiOperation({ summary: 'Cerrar periodo de nomina' })
  closePayroll(@Param('id') id: string) {
    return this.payrollService.closePayroll(id);
  }

  @Get('employee/:employeeId/history')
  @ApiOperation({ summary: 'Historial de nomina del empleado' })
  getEmployeeHistory(
    @Param('employeeId') employeeId: string,
    @Query('limit') limit?: number,
  ) {
    return this.payrollService.getEmployeePayrollHistory(employeeId, limit);
  }

  // Recibos de nomina
  @Get('employee/:employeeId/receipts')
  @ApiOperation({ summary: 'Obtener recibos de nomina del empleado' })
  getEmployeeReceipts(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    return this.receiptService.getEmployeeReceipts(employeeId, yearNumber);
  }

  @Get('receipts/:detailId/pdf')
  @ApiOperation({ summary: 'Descargar recibo de nomina en PDF' })
  async downloadReceipt(
    @Param('detailId') detailId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.receiptService.generateReceipt(detailId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=recibo_nomina_${detailId}.pdf`,
      'Content-Length': pdf.length,
    });

    res.send(pdf);
  }

  @Get('receipts/:detailId/view')
  @ApiOperation({ summary: 'Ver recibo de nomina en PDF' })
  async viewReceipt(
    @Param('detailId') detailId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.receiptService.generateReceipt(detailId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=recibo_nomina_${detailId}.pdf`,
      'Content-Length': pdf.length,
    });

    res.send(pdf);
  }

  // ============================================
  // MEJORA: ENDPOINTS DE AUDITORÍA FISCAL
  // ============================================

  @Get('receipts/:detailId/fiscal-audit')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Obtener auditoría fiscal de un recibo' })
  async getReceiptFiscalAudit(@Param('detailId') detailId: string) {
    return this.fiscalAuditService.getReceiptFiscalAudit(detailId);
  }

  @Get('periods/:id/fiscal-audit')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Obtener auditoría fiscal de un período completo' })
  async getPeriodFiscalAudit(@Param('id') id: string) {
    return this.fiscalAuditService.getPeriodFiscalAudit(id);
  }

  @Get('periods/:id/fiscal-audit/summary')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Obtener resumen de auditoría fiscal por concepto' })
  async getPeriodFiscalAuditSummary(@Param('id') id: string) {
    return this.fiscalAuditService.getAuditSummaryByPeriod(id);
  }

  // ============================================
  // MEJORA: ENDPOINTS DE VERSIONADO DE RECIBOS
  // ============================================

  @Get('receipts/:detailId/versions')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Obtener historial de versiones de un recibo' })
  async getReceiptVersions(@Param('detailId') detailId: string) {
    return this.versioningService.getVersionHistory(detailId);
  }

  @Get('receipts/:detailId/versions/:version')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Obtener una versión específica del recibo' })
  async getReceiptVersion(
    @Param('detailId') detailId: string,
    @Param('version') version: string,
  ) {
    return this.versioningService.getVersion(detailId, parseInt(version, 10));
  }

  @Get('receipts/:detailId/versions/compare')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Comparar dos versiones de un recibo' })
  async compareVersions(
    @Param('detailId') detailId: string,
    @Query('versionA') versionA: string,
    @Query('versionB') versionB: string,
  ) {
    return this.versioningService.compareVersions(
      detailId,
      parseInt(versionA, 10),
      parseInt(versionB, 10),
    );
  }

  @Get('receipts/:detailId/can-modify')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Verificar si un recibo puede ser modificado' })
  async canModifyReceipt(@Param('detailId') detailId: string) {
    return this.versioningService.canModify(detailId);
  }

  @Get('periods/:id/stamped-status')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Verificar si el período tiene recibos timbrados' })
  async getPeriodStampedStatus(@Param('id') id: string) {
    return this.versioningService.periodHasStampedReceipts(id);
  }

  // ============================================
  // ENTERPRISE: SNAPSHOTS DE REGLAS DE CÁLCULO
  // ============================================

  @Get('receipts/:detailId/ruleset-snapshot')
  @Permissions(PAYROLL_PERMISSIONS.VIEW_VERSIONS)
  @ApiOperation({ summary: 'Obtener snapshot de reglas de cálculo del recibo' })
  async getReceiptRulesetSnapshot(@Param('detailId') detailId: string) {
    return this.snapshotService.getLatestSnapshot(detailId);
  }

  @Get('receipts/:detailId/ruleset-snapshot/:version')
  @Permissions(PAYROLL_PERMISSIONS.VIEW_VERSIONS)
  @ApiOperation({ summary: 'Obtener snapshot específico por versión' })
  async getReceiptRulesetSnapshotVersion(
    @Param('detailId') detailId: string,
    @Param('version') version: string,
  ) {
    return this.snapshotService.getSnapshotByVersion(detailId, parseInt(version, 10));
  }

  @Get('receipts/:detailId/ruleset-snapshots')
  @Permissions(PAYROLL_PERMISSIONS.VIEW_VERSIONS)
  @ApiOperation({ summary: 'Listar todos los snapshots de reglas del recibo' })
  async getAllRulesetSnapshots(@Param('detailId') detailId: string) {
    return this.snapshotService.getAllSnapshots(detailId);
  }

  @Get('receipts/:detailId/ruleset-snapshot/compare')
  @Permissions(PAYROLL_PERMISSIONS.COMPARE_VERSIONS)
  @ApiOperation({ summary: 'Comparar dos snapshots de reglas' })
  async compareRulesetSnapshots(
    @Param('detailId') detailId: string,
    @Query('versionA') versionA: string,
    @Query('versionB') versionB: string,
  ) {
    return this.snapshotService.compareSnapshots(
      detailId,
      parseInt(versionA, 10),
      parseInt(versionB, 10),
    );
  }

  @Get('receipts/:detailId/calculation-context')
  @Permissions(PAYROLL_PERMISSIONS.VIEW_FISCAL_AUDIT)
  @ApiOperation({ summary: 'Obtener contexto de cálculo para reproducir recibo' })
  async getCalculationContext(@Param('detailId') detailId: string) {
    return this.snapshotService.getCalculationContext(detailId);
  }

  @Get('receipts/:detailId/snapshot-integrity')
  @Permissions(PAYROLL_PERMISSIONS.VIEW_FISCAL_AUDIT)
  @ApiOperation({ summary: 'Verificar integridad del snapshot vs valores actuales' })
  async verifySnapshotIntegrity(@Param('detailId') detailId: string) {
    return this.snapshotService.verifySnapshotIntegrity(detailId);
  }

  // ============================================
  // ENTERPRISE: AUTORIZACIÓN DE TIMBRADO
  // ============================================

  @Post('periods/:id/authorize-stamping')
  @Permissions(PAYROLL_PERMISSIONS.AUTHORIZE_STAMPING)
  @ApiOperation({ summary: 'Autorizar período para timbrado' })
  async authorizeStamping(
    @Param('id') id: string,
    @Body() details: AuthorizationDetails,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    return this.authorizationService.authorizePeriod(id, userId, details);
  }

  @Post('periods/:id/revoke-stamping-auth')
  @Permissions(PAYROLL_PERMISSIONS.REVOKE_STAMPING_AUTH)
  @ApiOperation({ summary: 'Revocar autorización de timbrado' })
  async revokeStampingAuth(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    return this.authorizationService.revokeAuthorization(id, userId, reason);
  }

  @Get('periods/:id/stamping-eligibility')
  @Permissions(PAYROLL_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Verificar si el período puede ser timbrado' })
  async checkStampingEligibility(@Param('id') id: string) {
    return this.authorizationService.canStamp(id);
  }

  @Get('periods/:id/authorization-history')
  @Permissions(PAYROLL_PERMISSIONS.VIEW_VERSIONS)
  @ApiOperation({ summary: 'Obtener historial de autorizaciones del período' })
  async getAuthorizationHistory(@Param('id') id: string) {
    return this.authorizationService.getAuthorizationHistory(id);
  }

  // ============================================
  // ENTERPRISE: DOCUMENTOS FISCALES
  // ============================================

  @Get('receipts/:detailId/documents')
  @Permissions(FISCAL_DOCUMENT_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Listar documentos fiscales del recibo' })
  async getReceiptDocuments(
    @Param('detailId') detailId: string,
    @Query('type') type?: FiscalDocumentType,
  ) {
    return this.documentService.getDocumentsForReceipt(detailId, { type });
  }

  @Get('documents/:documentId')
  @Permissions(FISCAL_DOCUMENT_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Obtener metadatos de documento' })
  async getDocumentMetadata(@Param('documentId') documentId: string) {
    const doc = await this.documentService.getDocument(documentId, { verifyIntegrity: false });
    // No devolver el contenido, solo metadatos
    const { content, ...metadata } = doc;
    return metadata;
  }

  @Get('documents/:documentId/download')
  @Permissions(FISCAL_DOCUMENT_PERMISSIONS.DOWNLOAD)
  @ApiOperation({ summary: 'Descargar documento fiscal' })
  async downloadDocument(
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    const doc = await this.documentService.getDocument(documentId);

    res.set({
      'Content-Type': doc.mimeType,
      'Content-Disposition': `attachment; filename=${doc.fileName}`,
      'Content-Length': doc.fileSize,
      'X-Document-SHA256': doc.sha256,
      'X-Integrity-Valid': doc.integrityValid.toString(),
    });

    res.send(doc.content);
  }

  @Get('documents/:documentId/verify')
  @Permissions(FISCAL_DOCUMENT_PERMISSIONS.VERIFY_INTEGRITY)
  @ApiOperation({ summary: 'Verificar integridad de documento' })
  async verifyDocumentIntegrity(@Param('documentId') documentId: string) {
    return this.documentService.verifyIntegrity(documentId);
  }

  @Get('periods/:id/documents-integrity')
  @Permissions(FISCAL_DOCUMENT_PERMISSIONS.VERIFY_INTEGRITY)
  @ApiOperation({ summary: 'Verificar integridad de todos los documentos del período' })
  async verifyPeriodDocumentsIntegrity(@Param('id') id: string) {
    return this.documentService.verifyPeriodIntegrity(id);
  }

  @Delete('documents/:documentId')
  @Permissions(FISCAL_DOCUMENT_PERMISSIONS.DELETE)
  @ApiOperation({ summary: 'Eliminar documento fiscal (soft delete)' })
  async deleteDocument(
    @Param('documentId') documentId: string,
    @Body('reason') reason: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    return this.documentService.deleteDocument(documentId, userId, reason);
  }
}
