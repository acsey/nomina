import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'Descripción del rol',
    example: 'Administrador de Recursos Humanos con acceso completo a gestión de empleados'
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description?: string;
}
