import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor(private prisma: PrismaService) {
    // Ensure upload directories exist
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dirs = ['photos', 'documents', 'temp'];
    dirs.forEach(dir => {
      const fullPath = path.join(this.uploadDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  async uploadEmployeePhoto(
    employeeId: string,
    file: Express.Multer.File,
  ): Promise<{ photoUrl: string }> {
    // Verify employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de archivo no permitido. Use JPG, PNG o WebP',
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('El archivo no puede ser mayor a 5MB');
    }

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${employeeId}-${Date.now()}${ext}`;
    const photosDir = path.join(this.uploadDir, 'photos');
    const filePath = path.join(photosDir, filename);

    // Delete old photo if exists
    if (employee.photoUrl) {
      const oldFilename = employee.photoUrl.split('/').pop();
      if (oldFilename) {
        const oldPath = path.join(photosDir, oldFilename);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    // Save new file
    fs.writeFileSync(filePath, file.buffer);

    // Update employee with new photo URL
    const photoUrl = `/uploads/photos/${filename}`;
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { photoUrl },
    });

    return { photoUrl };
  }

  async deleteEmployeePhoto(employeeId: string): Promise<void> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    if (employee.photoUrl) {
      const filename = employee.photoUrl.split('/').pop();
      if (filename) {
        const filePath = path.join(this.uploadDir, 'photos', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await this.prisma.employee.update({
        where: { id: employeeId },
        data: { photoUrl: null },
      });
    }
  }

  getFilePath(relativePath: string): string | null {
    const fullPath = path.join(this.uploadDir, relativePath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    return null;
  }

  async uploadEmployeeDocument(
    employeeId: string,
    file: Express.Multer.File,
    documentData: {
      name: string;
      type: string;
      description?: string;
      expiresAt?: string;
    },
    uploadedById: string,
  ) {
    // Verify employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de archivo no permitido. Use PDF, JPG, PNG o WebP',
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('El archivo no puede ser mayor a 10MB');
    }

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${employeeId}-${documentData.type}-${Date.now()}${ext}`;
    const documentsDir = path.join(this.uploadDir, 'documents');
    const filePath = path.join(documentsDir, filename);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Create document record in database
    const documentPath = `/uploads/documents/${filename}`;
    const document = await this.prisma.employeeDocument.create({
      data: {
        employeeId,
        type: documentData.type as any,
        name: documentData.name,
        path: documentPath,
        fileSize: file.size,
        mimeType: file.mimetype,
        description: documentData.description,
        expiresAt: documentData.expiresAt ? new Date(documentData.expiresAt) : null,
        uploadedById,
        validationStatus: 'PENDING',
      },
    });

    return document;
  }

  async deleteEmployeeDocument(documentId: string, employeeId: string): Promise<void> {
    const document = await this.prisma.employeeDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new BadRequestException('Documento no encontrado');
    }

    if (document.employeeId !== employeeId) {
      throw new BadRequestException('No tienes permiso para eliminar este documento');
    }

    // Delete file from disk
    if (document.path) {
      const filename = document.path.split('/').pop();
      if (filename) {
        const filePath = path.join(this.uploadDir, 'documents', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // Delete record from database
    await this.prisma.employeeDocument.delete({
      where: { id: documentId },
    });
  }
}
