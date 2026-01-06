import { IsEmail, IsString, MinLength, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@empresa.com' })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiPropertyOptional({ example: '123456', description: 'Código MFA de 6-8 dígitos (requerido si MFA está habilitado)' })
  @IsOptional()
  @IsString()
  @Length(6, 8, { message: 'El código MFA debe tener entre 6 y 8 caracteres' })
  mfaCode?: string;
}
