import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import { CurrentUser } from '@/common/decorators';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('employees/:employeeId/photo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadEmployeePhoto(
    @Param('employeeId') employeeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadsService.uploadEmployeePhoto(employeeId, file);
  }

  @Delete('employees/:employeeId/photo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async deleteEmployeePhoto(@Param('employeeId') employeeId: string) {
    await this.uploadsService.deleteEmployeePhoto(employeeId);
    return { message: 'Foto eliminada correctamente' };
  }

  @Get('photos/:filename')
  async getPhoto(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.uploadsService.getFilePath(`photos/${filename}`);
    if (!filePath) {
      throw new NotFoundException('Archivo no encontrado');
    }
    return res.sendFile(filePath);
  }

  @Get('documents/:filename')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getDocument(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.uploadsService.getFilePath(`documents/${filename}`);
    if (!filePath) {
      throw new NotFoundException('Archivo no encontrado');
    }
    return res.sendFile(filePath);
  }

  @Post('employees/:employeeId/documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir documento de empleado' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        name: {
          type: 'string',
        },
        type: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        expiresAt: {
          type: 'string',
          format: 'date',
        },
      },
    },
  })
  async uploadEmployeeDocument(
    @Param('employeeId') employeeId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() documentData: { name: string; type: string; description?: string; expiresAt?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.uploadsService.uploadEmployeeDocument(employeeId, file, documentData, userId);
  }

  @Delete('employees/:employeeId/documents/:documentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar documento de empleado' })
  async deleteEmployeeDocument(
    @Param('employeeId') employeeId: string,
    @Param('documentId') documentId: string,
  ) {
    await this.uploadsService.deleteEmployeeDocument(documentId, employeeId);
    return { message: 'Documento eliminado correctamente' };
  }
}
