import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@empresa.com' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({ example: 'Juan' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser texto' })
  firstName: string;

  @ApiProperty({ example: 'García' })
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @IsString({ message: 'El apellido debe ser texto' })
  lastName: string;

  @ApiProperty({ description: 'ID del rol' })
  @IsNotEmpty({ message: 'El rol es requerido' })
  @IsUUID('4', { message: 'Seleccione un rol válido' })
  roleId: string;

  @ApiPropertyOptional({ description: 'ID de la empresa asignada' })
  @IsOptional()
  @IsUUID('4', { message: 'Seleccione una empresa válida' })
  companyId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean({ message: 'El estado debe ser verdadero o falso' })
  isActive?: boolean;
}
