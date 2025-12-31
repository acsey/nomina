import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/security/audit.service';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Tipos de documento fiscal soportados
 */
export enum FiscalDocumentType {
  XML_ORIGINAL = 'XML_ORIGINAL', // XML sellado antes de timbrar
  XML_TIMBRADO = 'XML_TIMBRADO', // XML con timbre fiscal
  PDF_RECIBO = 'PDF_RECIBO', // PDF del recibo de nómina
  CANCEL_REQUEST = 'CANCEL_REQUEST', // Solicitud de cancelación
  CANCEL_ACK = 'CANCEL_ACK', // Acuse de cancelación
  AUDIT_REPORT = 'AUDIT_REPORT', // Reporte de auditoría fiscal
}

/**
 * Servicio para gestionar almacenamiento de documentos fiscales con integridad garantizada.
 *
 * Características:
 * - Almacenamiento versionado con rutas estructuradas
 * - Verificación de integridad mediante SHA256
 * - Eliminación lógica (soft delete) para cumplimiento fiscal
 * - Auditoría completa de acceso y modificaciones
 */
@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);
  private readonly baseStoragePath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    this.baseStoragePath = process.env.FISCAL_STORAGE_PATH || './storage/fiscal';
  }

  /**
   * Almacena un documento fiscal con verificación de integridad
   */
  async storeDocument(
    payrollDetailId: string,
    type: FiscalDocumentType,
    content: Buffer | string,
    options: StoreDocumentOptions,
  ): Promise<StoredDocumentResult> {
    const detail = await this.prisma.payrollDetail.findUnique({
      where: { id: payrollDetailId },
      include: {
        period: {
          select: { companyId: true, year: true, periodNumber: true },
        },
        cfdiNomina: true,
        documents: {
          where: { type, isActive: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!detail) {
      throw new NotFoundException(`PayrollDetail ${payrollDetailId} no encontrado`);
    }

    // Convertir contenido a Buffer
    const contentBuffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

    // Calcular SHA256
    const sha256 = crypto.createHash('sha256').update(contentBuffer).digest('hex');

    // Verificar si ya existe documento con mismo hash
    const existingWithHash = await this.prisma.receiptDocument.findFirst({
      where: { sha256, isActive: true },
    });

    if (existingWithHash && !options.allowDuplicate) {
      throw new ConflictException(
        `Ya existe un documento con el mismo contenido (SHA256: ${sha256.substring(0, 16)}...)`,
      );
    }

    // Determinar versión
    const nextVersion = detail.documents.length > 0
      ? detail.documents[0].version + 1
      : 1;

    // Generar ruta de almacenamiento estructurada
    const storagePath = this.generateStoragePath(
      detail.period.companyId,
      detail.period.year,
      detail.period.periodNumber,
      payrollDetailId,
      type,
      nextVersion,
    );

    // Determinar nombre de archivo
    const fileName = options.fileName || this.generateFileName(payrollDetailId, type, nextVersion);

    // Determinar MIME type
    const mimeType = options.mimeType || this.getMimeType(type);

    // Guardar archivo físico
    await this.saveFile(storagePath, contentBuffer);

    // Crear registro en base de datos
    const document = await this.prisma.receiptDocument.create({
      data: {
        payrollDetailId,
        cfdiId: detail.cfdiNomina?.id,
        type,
        storagePath,
        fileName,
        mimeType,
        fileSize: contentBuffer.length,
        sha256,
        version: nextVersion,
        createdBy: options.userId,
      },
    });

    // Si hay versión anterior, marcarla como inactiva
    if (detail.documents.length > 0) {
      await this.prisma.receiptDocument.update({
        where: { id: detail.documents[0].id },
        data: { isActive: false },
      });
    }

    // Auditoría
    await this.auditService.logCriticalAction({
      userId: options.userId || 'system',
      action: 'STORE_FISCAL_DOCUMENT',
      entity: 'ReceiptDocument',
      entityId: document.id,
      details: {
        payrollDetailId,
        type,
        version: nextVersion,
        fileSize: contentBuffer.length,
        sha256: sha256.substring(0, 16) + '...',
      },
    });

    this.logger.log(
      `Documento ${type} v${nextVersion} almacenado para recibo ${payrollDetailId}`,
    );

    return {
      id: document.id,
      payrollDetailId,
      type,
      version: nextVersion,
      storagePath,
      fileName,
      fileSize: contentBuffer.length,
      sha256,
      createdAt: document.createdAt,
    };
  }

  /**
   * Recupera un documento fiscal
   */
  async getDocument(
    documentId: string,
    options?: GetDocumentOptions,
  ): Promise<RetrievedDocument> {
    const document = await this.prisma.receiptDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Documento ${documentId} no encontrado`);
    }

    if (!document.isActive && !options?.includeDeleted) {
      throw new NotFoundException(`Documento ${documentId} ha sido eliminado`);
    }

    // Leer contenido del archivo
    const content = await this.readFile(document.storagePath);

    // Verificar integridad
    const currentHash = crypto.createHash('sha256').update(content).digest('hex');
    const integrityValid = currentHash === document.sha256;

    if (!integrityValid && options?.verifyIntegrity !== false) {
      this.logger.error(
        `Integridad comprometida para documento ${documentId}: esperado ${document.sha256}, obtenido ${currentHash}`,
      );
    }

    return {
      id: document.id,
      payrollDetailId: document.payrollDetailId,
      cfdiId: document.cfdiId,
      type: document.type as FiscalDocumentType,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      sha256: document.sha256,
      version: document.version,
      content,
      integrityValid,
      createdAt: document.createdAt,
      createdBy: document.createdBy,
    };
  }

  /**
   * Lista todos los documentos de un recibo
   */
  async getDocumentsForReceipt(
    payrollDetailId: string,
    options?: ListDocumentsOptions,
  ): Promise<DocumentListItem[]> {
    const documents = await this.prisma.receiptDocument.findMany({
      where: {
        payrollDetailId,
        ...(options?.type ? { type: options.type } : {}),
        ...(options?.includeDeleted ? {} : { isActive: true }),
      },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });

    return documents.map((doc) => ({
      id: doc.id,
      type: doc.type as FiscalDocumentType,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      sha256: doc.sha256,
      version: doc.version,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      deletedAt: doc.deletedAt,
    }));
  }

  /**
   * Verifica la integridad de un documento
   */
  async verifyIntegrity(documentId: string): Promise<IntegrityCheckResult> {
    const document = await this.prisma.receiptDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Documento ${documentId} no encontrado`);
    }

    try {
      const content = await this.readFile(document.storagePath);
      const currentHash = crypto.createHash('sha256').update(content).digest('hex');
      const isValid = currentHash === document.sha256;

      return {
        documentId,
        isValid,
        expectedHash: document.sha256,
        actualHash: currentHash,
        fileExists: true,
        verifiedAt: new Date(),
      };
    } catch (error) {
      return {
        documentId,
        isValid: false,
        expectedHash: document.sha256,
        actualHash: null,
        fileExists: false,
        verifiedAt: new Date(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Verifica la integridad de todos los documentos de un período
   */
  async verifyPeriodIntegrity(periodId: string): Promise<PeriodIntegrityResult> {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: {
        details: {
          include: {
            documents: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!period) {
      throw new NotFoundException(`Período ${periodId} no encontrado`);
    }

    const allDocuments = period.details.flatMap((d) => d.documents);
    const results: IntegrityCheckResult[] = [];

    for (const doc of allDocuments) {
      const result = await this.verifyIntegrity(doc.id);
      results.push(result);
    }

    const validCount = results.filter((r) => r.isValid).length;
    const invalidCount = results.filter((r) => !r.isValid).length;

    return {
      periodId,
      totalDocuments: allDocuments.length,
      validDocuments: validCount,
      invalidDocuments: invalidCount,
      isFullyValid: invalidCount === 0,
      verifiedAt: new Date(),
      details: results,
    };
  }

  /**
   * Eliminación lógica de documento (soft delete)
   */
  async deleteDocument(
    documentId: string,
    userId: string,
    reason: string,
  ): Promise<DeleteDocumentResult> {
    const document = await this.prisma.receiptDocument.findUnique({
      where: { id: documentId },
      include: {
        payrollDetail: {
          include: {
            cfdiNomina: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Documento ${documentId} no encontrado`);
    }

    if (!document.isActive) {
      throw new BadRequestException('El documento ya está eliminado');
    }

    // Verificar si es un documento fiscal inmutable (XML timbrado)
    if (
      document.type === FiscalDocumentType.XML_TIMBRADO &&
      document.payrollDetail.cfdiNomina?.status === 'STAMPED'
    ) {
      throw new BadRequestException(
        'No se puede eliminar un XML timbrado de un CFDI válido. Debe cancelar el CFDI primero.',
      );
    }

    await this.prisma.receiptDocument.update({
      where: { id: documentId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: userId,
        deleteReason: reason,
      },
    });

    // Auditoría
    await this.auditService.logCriticalAction({
      userId,
      action: 'DELETE_FISCAL_DOCUMENT',
      entity: 'ReceiptDocument',
      entityId: documentId,
      details: {
        type: document.type,
        fileName: document.fileName,
        reason,
        sha256: document.sha256.substring(0, 16) + '...',
      },
    });

    this.logger.log(`Documento ${documentId} eliminado por ${userId}: ${reason}`);

    return {
      documentId,
      deletedBy: userId,
      deletedAt: new Date(),
      reason,
    };
  }

  /**
   * Genera URL de descarga temporal para un documento
   */
  async generateDownloadUrl(
    documentId: string,
    expiresInMinutes: number = 30,
  ): Promise<DownloadUrlResult> {
    const document = await this.prisma.receiptDocument.findUnique({
      where: { id: documentId },
    });

    if (!document || !document.isActive) {
      throw new NotFoundException(`Documento ${documentId} no encontrado`);
    }

    // Generar token temporal
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // En producción, esto debería almacenarse en Redis o similar
    // Por ahora, usamos un enfoque simplificado con JWT o similar

    return {
      documentId,
      downloadUrl: `/api/v1/payroll/documents/${documentId}/download?token=${token}`,
      expiresAt,
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }

  // === Private Methods ===

  private generateStoragePath(
    companyId: string,
    year: number,
    periodNumber: number,
    detailId: string,
    type: FiscalDocumentType,
    version: number,
  ): string {
    const datePath = `${year}/${String(periodNumber).padStart(2, '0')}`;
    const fileName = `${detailId}_${type.toLowerCase()}_v${version}${this.getExtension(type)}`;
    return path.join(this.baseStoragePath, companyId, datePath, fileName);
  }

  private generateFileName(
    detailId: string,
    type: FiscalDocumentType,
    version: number,
  ): string {
    const timestamp = Date.now();
    return `${type.toLowerCase()}_${detailId.substring(0, 8)}_v${version}_${timestamp}${this.getExtension(type)}`;
  }

  private getExtension(type: FiscalDocumentType): string {
    switch (type) {
      case FiscalDocumentType.XML_ORIGINAL:
      case FiscalDocumentType.XML_TIMBRADO:
      case FiscalDocumentType.CANCEL_REQUEST:
      case FiscalDocumentType.CANCEL_ACK:
        return '.xml';
      case FiscalDocumentType.PDF_RECIBO:
        return '.pdf';
      case FiscalDocumentType.AUDIT_REPORT:
        return '.json';
      default:
        return '.bin';
    }
  }

  private getMimeType(type: FiscalDocumentType): string {
    switch (type) {
      case FiscalDocumentType.XML_ORIGINAL:
      case FiscalDocumentType.XML_TIMBRADO:
      case FiscalDocumentType.CANCEL_REQUEST:
      case FiscalDocumentType.CANCEL_ACK:
        return 'application/xml';
      case FiscalDocumentType.PDF_RECIBO:
        return 'application/pdf';
      case FiscalDocumentType.AUDIT_REPORT:
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }

  private async saveFile(filePath: string, content: Buffer): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content);
  }

  private async readFile(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }
}

// === DTOs e Interfaces ===

export interface StoreDocumentOptions {
  userId?: string;
  fileName?: string;
  mimeType?: string;
  allowDuplicate?: boolean;
}

export interface StoredDocumentResult {
  id: string;
  payrollDetailId: string;
  type: FiscalDocumentType;
  version: number;
  storagePath: string;
  fileName: string;
  fileSize: number;
  sha256: string;
  createdAt: Date;
}

export interface GetDocumentOptions {
  verifyIntegrity?: boolean;
  includeDeleted?: boolean;
}

export interface RetrievedDocument {
  id: string;
  payrollDetailId: string;
  cfdiId: string | null;
  type: FiscalDocumentType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  version: number;
  content: Buffer;
  integrityValid: boolean;
  createdAt: Date;
  createdBy: string | null;
}

export interface ListDocumentsOptions {
  type?: FiscalDocumentType;
  includeDeleted?: boolean;
}

export interface DocumentListItem {
  id: string;
  type: FiscalDocumentType;
  fileName: string;
  fileSize: number;
  sha256: string;
  version: number;
  isActive: boolean;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface IntegrityCheckResult {
  documentId: string;
  isValid: boolean;
  expectedHash: string;
  actualHash: string | null;
  fileExists: boolean;
  verifiedAt: Date;
  error?: string;
}

export interface PeriodIntegrityResult {
  periodId: string;
  totalDocuments: number;
  validDocuments: number;
  invalidDocuments: number;
  isFullyValid: boolean;
  verifiedAt: Date;
  details: IntegrityCheckResult[];
}

export interface DeleteDocumentResult {
  documentId: string;
  deletedBy: string;
  deletedAt: Date;
  reason: string;
}

export interface DownloadUrlResult {
  documentId: string;
  downloadUrl: string;
  expiresAt: Date;
  fileName: string;
  mimeType: string;
}
