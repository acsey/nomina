import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

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
}
