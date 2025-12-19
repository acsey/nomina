import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@/common/decorators';

@ApiTags('employees')
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Crear nuevo empleado' })
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar empleados' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
  ) {
    return this.employeesService.findAll({
      skip,
      take,
      search,
      departmentId,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener empleado por ID' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Actualizar empleado' })
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Desactivar empleado' })
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  @Post(':id/terminate')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Dar de baja a empleado' })
  terminate(
    @Param('id') id: string,
    @Body('terminationDate') terminationDate: Date,
  ) {
    return this.employeesService.terminate(id, terminationDate);
  }

  @Post(':id/salary')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Actualizar salario del empleado' })
  updateSalary(
    @Param('id') id: string,
    @Body('newSalary') newSalary: number,
    @Body('reason') reason?: string,
  ) {
    return this.employeesService.updateSalary(id, newSalary, reason);
  }
}
