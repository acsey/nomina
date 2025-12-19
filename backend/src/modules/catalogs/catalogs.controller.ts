import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsOptional, IsEmail } from 'class-validator';

class CreateCompanyDto {
  @IsString()
  name: string;

  @IsString()
  rfc: string;

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

@ApiTags('catalogs')
@Controller('catalogs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CatalogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('companies')
  @ApiOperation({ summary: 'Listar empresas' })
  async getCompanies() {
    return this.prisma.company.findMany({
      orderBy: { name: 'asc' },
    });
  }

  @Post('companies')
  @ApiOperation({ summary: 'Crear empresa' })
  async createCompany(@Body() data: CreateCompanyDto) {
    return this.prisma.company.create({
      data: {
        name: data.name,
        rfc: data.rfc.toUpperCase(),
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
  @ApiOperation({ summary: 'Actualizar empresa' })
  async updateCompany(@Param('id') id: string, @Body() data: UpdateCompanyDto) {
    return this.prisma.company.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.rfc && { rfc: data.rfc.toUpperCase() }),
        ...(data.registroPatronal !== undefined && { registroPatronal: data.registroPatronal }),
        ...(data.registroPatronalIssste !== undefined && { registroPatronalIssste: data.registroPatronalIssste }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.zipCode !== undefined && { zipCode: data.zipCode }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
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
