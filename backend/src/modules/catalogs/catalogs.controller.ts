import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { IsString, IsOptional, IsEmail, IsBoolean, IsArray, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class CreateCompanyDto {
  @IsString()
  name: string;

  @IsString()
  rfc: string;

  @IsString()
  @IsOptional()
  institutionType?: string; // PRIVATE or GOVERNMENT

  @IsString()
  @IsOptional()
  govInstitution?: string; // IMSS, ISSSTE, INSABI, etc.

  @IsString()
  @IsOptional()
  registroPatronal?: string;

  @IsString()
  @IsOptional()
  registroPatronalIssste?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zipCode?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}

class UpdateCompanyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  rfc?: string;

  @IsString()
  @IsOptional()
  institutionType?: string;

  @IsString()
  @IsOptional()
  govInstitution?: string | null;

  @IsString()
  @IsOptional()
  registroPatronal?: string;

  @IsString()
  @IsOptional()
  registroPatronalIssste?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zipCode?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  // Branding
  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @IsOptional()
  secondaryColor?: string;

  // Configuración CFDI
  @IsString()
  @IsOptional()
  regimenFiscal?: string;

  @IsString()
  @IsOptional()
  certificadoCer?: string;

  @IsString()
  @IsOptional()
  certificadoKey?: string;

  @IsString()
  @IsOptional()
  certificadoPassword?: string;

  @IsString()
  @IsOptional()
  noCertificado?: string;

  // Configuración PAC
  @IsString()
  @IsOptional()
  pacProvider?: string;

  @IsString()
  @IsOptional()
  pacUser?: string;

  @IsString()
  @IsOptional()
  pacPassword?: string;

  @IsString()
  @IsOptional()
  pacMode?: string;
}

// Work Schedule DTOs
class ScheduleDetailDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsString()
  @IsOptional()
  breakStart?: string;

  @IsString()
  @IsOptional()
  breakEnd?: string;

  @IsBoolean()
  isWorkDay: boolean;
}

class CreateWorkScheduleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDetailDto)
  @IsOptional()
  scheduleDetails?: ScheduleDetailDto[];
}

class UpdateWorkScheduleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDetailDto)
  @IsOptional()
  scheduleDetails?: ScheduleDetailDto[];
}

@ApiTags('catalogs')
@Controller('catalogs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CatalogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('companies')
  @ApiOperation({ summary: 'Listar empresas' })
  async getCompanies(@CurrentUser() user: any) {
    // System Admin puede ver todas las empresas
    // Otros roles solo ven su propia empresa
    if (user.role === 'admin' || user.role === 'SYSTEM_ADMIN') {
      return this.prisma.company.findMany({
        orderBy: { name: 'asc' },
      });
    }

    // Si el usuario tiene companyId, solo puede ver su empresa
    if (user.companyId) {
      return this.prisma.company.findMany({
        where: { id: user.companyId },
        orderBy: { name: 'asc' },
      });
    }

    // Si no tiene companyId y no es admin, devolver vacío
    return [];
  }

  @Post('companies')
  @Roles('admin', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Crear empresa (solo admin)' })
  async createCompany(@Body() data: CreateCompanyDto) {
    return this.prisma.company.create({
      data: {
        name: data.name,
        rfc: data.rfc.toUpperCase(),
        institutionType: (data.institutionType as any) || 'PRIVATE',
        govInstitution: data.govInstitution as any,
        registroPatronal: data.registroPatronal,
        registroPatronalIssste: data.registroPatronalIssste,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        phone: data.phone,
        email: data.email,
      },
    });
  }

  @Patch('companies/:id')
  @Roles('admin', 'SYSTEM_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Actualizar empresa (admin puede todas, company_admin y rh solo la suya)' })
  async updateCompany(
    @Param('id') id: string,
    @Body() data: UpdateCompanyDto,
    @CurrentUser() user: any,
  ) {
    // System Admin puede editar cualquier empresa, otros solo la suya
    const isSystemAdmin = user.role === 'admin' || user.role === 'SYSTEM_ADMIN';
    if (!isSystemAdmin && user.companyId !== id) {
      throw new ForbiddenException('Solo puedes editar tu propia empresa');
    }

    return this.prisma.company.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.rfc && { rfc: data.rfc.toUpperCase() }),
        ...(data.institutionType && { institutionType: data.institutionType as any }),
        ...(data.govInstitution !== undefined && { govInstitution: data.govInstitution as any }),
        ...(data.registroPatronal !== undefined && { registroPatronal: data.registroPatronal }),
        ...(data.registroPatronalIssste !== undefined && { registroPatronalIssste: data.registroPatronalIssste }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.zipCode !== undefined && { zipCode: data.zipCode }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        // Branding
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
        ...(data.secondaryColor !== undefined && { secondaryColor: data.secondaryColor }),
        // Configuración CFDI
        ...(data.regimenFiscal !== undefined && { regimenFiscal: data.regimenFiscal }),
        ...(data.certificadoCer !== undefined && { certificadoCer: data.certificadoCer }),
        ...(data.certificadoKey !== undefined && { certificadoKey: data.certificadoKey }),
        ...(data.certificadoPassword !== undefined && { certificadoPassword: data.certificadoPassword }),
        ...(data.noCertificado !== undefined && { noCertificado: data.noCertificado }),
        // Configuración PAC
        ...(data.pacProvider !== undefined && { pacProvider: data.pacProvider }),
        ...(data.pacUser !== undefined && { pacUser: data.pacUser }),
        ...(data.pacPassword !== undefined && { pacPassword: data.pacPassword }),
        ...(data.pacMode !== undefined && { pacMode: data.pacMode }),
      },
    });
  }

  @Get('job-positions')
  @ApiOperation({ summary: 'Listar puestos de trabajo' })
  async getJobPositions() {
    return this.prisma.jobPosition.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  @Get('banks')
  @ApiOperation({ summary: 'Listar bancos' })
  async getBanks() {
    return this.prisma.bank.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  @Get('work-schedules')
  @ApiOperation({ summary: 'Listar horarios de trabajo' })
  async getWorkSchedules() {
    return this.prisma.workSchedule.findMany({
      include: {
        scheduleDetails: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get('work-schedules/:id')
  @ApiOperation({ summary: 'Obtener horario de trabajo por ID' })
  async getWorkScheduleById(@Param('id') id: string) {
    return this.prisma.workSchedule.findUnique({
      where: { id },
      include: {
        scheduleDetails: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });
  }

  @Post('work-schedules')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Crear horario de trabajo' })
  async createWorkSchedule(@Body() data: CreateWorkScheduleDto) {
    return this.prisma.workSchedule.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
        scheduleDetails: data.scheduleDetails
          ? {
              create: data.scheduleDetails.map((detail: any) => ({
                dayOfWeek: detail.dayOfWeek,
                startTime: detail.startTime,
                endTime: detail.endTime,
                breakStart: detail.breakStart,
                breakEnd: detail.breakEnd,
                isWorkDay: detail.isWorkDay,
              })),
            }
          : undefined,
      },
      include: {
        scheduleDetails: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });
  }

  @Patch('work-schedules/:id')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Actualizar horario de trabajo' })
  async updateWorkSchedule(@Param('id') id: string, @Body() data: UpdateWorkScheduleDto) {
    // If scheduleDetails are provided, delete existing and create new ones
    if (data.scheduleDetails) {
      await this.prisma.workScheduleDetail.deleteMany({
        where: { workScheduleId: id },
      });
    }

    return this.prisma.workSchedule.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.scheduleDetails && {
          scheduleDetails: {
            create: data.scheduleDetails.map((detail: any) => ({
              dayOfWeek: detail.dayOfWeek,
              startTime: detail.startTime,
              endTime: detail.endTime,
              breakStart: detail.breakStart,
              breakEnd: detail.breakEnd,
              isWorkDay: detail.isWorkDay,
            })),
          },
        }),
      },
      include: {
        scheduleDetails: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });
  }

  @Delete('work-schedules/:id')
  @Roles('admin', 'company_admin', 'rh')
  @ApiOperation({ summary: 'Eliminar horario de trabajo' })
  async deleteWorkSchedule(@Param('id') id: string) {
    // First delete related schedule details
    await this.prisma.workScheduleDetail.deleteMany({
      where: { workScheduleId: id },
    });

    return this.prisma.workSchedule.delete({
      where: { id },
    });
  }
}
