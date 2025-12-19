import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { BulkUploadService } from './bulk-upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('bulk-upload')
@Controller('bulk-upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BulkUploadController {
  constructor(private readonly bulkUploadService: BulkUploadService) {}

  // ==================== TEMPLATE DOWNLOADS ====================

  @Get('templates/employees')
  @ApiOperation({ summary: 'Descargar plantilla de empleados' })
  async downloadEmployeesTemplate(@Res() res: Response) {
    const buffer = await this.bulkUploadService.generateEmployeesTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=plantilla_empleados.xlsx',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('templates/companies')
  @ApiOperation({ summary: 'Descargar plantilla de empresas' })
  async downloadCompaniesTemplate(@Res() res: Response) {
    const buffer = await this.bulkUploadService.generateCompaniesTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=plantilla_empresas.xlsx',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('templates/departments')
  @ApiOperation({ summary: 'Descargar plantilla de departamentos' })
  async downloadDepartmentsTemplate(@Res() res: Response) {
    const buffer = await this.bulkUploadService.generateDepartmentsTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=plantilla_departamentos.xlsx',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('templates/benefits')
  @ApiOperation({ summary: 'Descargar plantilla de prestaciones' })
  async downloadBenefitsTemplate(@Res() res: Response) {
    const buffer = await this.bulkUploadService.generateBenefitsTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=plantilla_prestaciones.xlsx',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('templates/job-positions')
  @ApiOperation({ summary: 'Descargar plantilla de puestos' })
  async downloadJobPositionsTemplate(@Res() res: Response) {
    const buffer = await this.bulkUploadService.generateJobPositionsTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=plantilla_puestos.xlsx',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ==================== FILE UPLOADS ====================

  @Post('import/employees/:companyId')
  @ApiOperation({ summary: 'Importar empleados desde Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importEmployees(
    @Param('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }
    if (!file.originalname.endsWith('.xlsx')) {
      throw new BadRequestException('El archivo debe ser un Excel (.xlsx)');
    }
    return this.bulkUploadService.importEmployees(file.buffer, companyId);
  }

  @Post('import/companies')
  @ApiOperation({ summary: 'Importar empresas desde Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importCompanies(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }
    if (!file.originalname.endsWith('.xlsx')) {
      throw new BadRequestException('El archivo debe ser un Excel (.xlsx)');
    }
    return this.bulkUploadService.importCompanies(file.buffer);
  }

  @Post('import/departments')
  @ApiOperation({ summary: 'Importar departamentos desde Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importDepartments(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }
    if (!file.originalname.endsWith('.xlsx')) {
      throw new BadRequestException('El archivo debe ser un Excel (.xlsx)');
    }
    return this.bulkUploadService.importDepartments(file.buffer);
  }

  @Post('import/benefits')
  @ApiOperation({ summary: 'Importar prestaciones desde Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importBenefits(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }
    if (!file.originalname.endsWith('.xlsx')) {
      throw new BadRequestException('El archivo debe ser un Excel (.xlsx)');
    }
    return this.bulkUploadService.importBenefits(file.buffer);
  }

  @Post('import/job-positions')
  @ApiOperation({ summary: 'Importar puestos desde Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importJobPositions(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }
    if (!file.originalname.endsWith('.xlsx')) {
      throw new BadRequestException('El archivo debe ser un Excel (.xlsx)');
    }
    return this.bulkUploadService.importJobPositions(file.buffer);
  }
}
