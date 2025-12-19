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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '@/common/decorators';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.usersService.create(createUserDto, {
      role: user.role || user.roleName,
      companyId: user.companyId,
    });
  }

  @Get()
  @Roles('admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(
      {
        role: user.role || user.roleName,
        companyId: user.companyId,
      },
      { skip, take, search },
    );
  }

  @Get('roles')
  @Roles('admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Obtener roles asignables' })
  getRoles(@CurrentUser() user: any) {
    return this.usersService.getRoles({
      role: user.role || user.roleName,
    });
  }

  @Get(':id')
  @Roles('admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.usersService.findOne(id, {
      role: user.role || user.roleName,
      companyId: user.companyId,
    });
  }

  @Patch(':id')
  @Roles('admin', 'rh', 'manager')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.usersService.update(id, updateUserDto, {
      role: user.role || user.roleName,
      companyId: user.companyId,
    });
  }

  @Delete(':id')
  @Roles('admin', 'rh')
  @ApiOperation({ summary: 'Desactivar usuario' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.usersService.remove(id, {
      role: user.role || user.roleName,
      companyId: user.companyId,
    });
  }
}
