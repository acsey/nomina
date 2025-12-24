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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@/common/decorators';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'company_admin', 'rh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar dispositivos biometricos' })
  findAll(@Query('companyId') companyId: string) {
    return this.devicesService.findAll(companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'company_admin', 'rh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener dispositivo por ID' })
  findById(@Param('id') id: string) {
    return this.devicesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'company_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar nuevo dispositivo' })
  create(@Body() data: any) {
    return this.devicesService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'company_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar dispositivo' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.devicesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'company_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar dispositivo' })
  delete(@Param('id') id: string) {
    return this.devicesService.delete(id);
  }

  @Post(':id/test-connection')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'company_admin', 'rh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Probar conexion con dispositivo' })
  testConnection(@Param('id') id: string) {
    return this.devicesService.testConnection(id);
  }

  @Post(':id/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'company_admin', 'rh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sincronizar registros del dispositivo' })
  syncRecords(@Param('id') id: string) {
    return this.devicesService.syncRecords(id);
  }

  @Get(':id/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'company_admin', 'rh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener logs del dispositivo' })
  getLogs(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.devicesService.getDeviceLogs(id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // Webhook para recibir registros de dispositivos (modo PUSH)
  @Post('webhook/attendance')
  @ApiOperation({ summary: 'Webhook para recibir registros de asistencia' })
  receiveAttendance(@Body() data: any) {
    return this.devicesService.receiveAttendanceRecord(data);
  }
}
