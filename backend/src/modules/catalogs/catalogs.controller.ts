import { Controller, Get, Post, Patch, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { IsString, IsOptional, IsEmail } from 'class-validator';

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

@ApiTags('catalogs')
@Controller('catalogs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CatalogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('companies')
  @ApiOperation({ summary: 'Listar empresas' })
  async getCompanies(@CurrentUser() user: any) {
    // Admin puede ver todas las empresas
    // Otros roles solo ven su propia empresa
    if (user.role === 'admin') {
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
  @Roles('admin')
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
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Actualizar empresa (admin puede todas, rh solo la suya)' })
  async updateCompany(
    @Param('id') id: string,
    @Body() data: UpdateCompanyDto,
    @CurrentUser() user: any,
  ) {
    // RH solo puede editar su propia empresa
    if (user.role !== 'admin' && user.companyId !== id) {
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
      where: { isActive: true },
      include: {
        scheduleDetails: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
