import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
