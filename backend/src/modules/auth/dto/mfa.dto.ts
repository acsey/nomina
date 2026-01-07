import { IsString, IsNotEmpty, Length, Matches, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaDto {
  @ApiProperty({ description: 'Código TOTP de 6 dígitos', example: '123456' })
  @IsNotEmpty({ message: 'El código MFA es requerido' })
  @IsString({ message: 'El código MFA debe ser texto' })
  @Length(6, 8, { message: 'El código MFA debe tener entre 6 y 8 caracteres' })
  @Matches(/^[0-9A-Z]+$/, { message: 'El código MFA debe ser numérico o alfanumérico' })
  code: string;
}

export class MfaSetupResponseDto {
  @ApiProperty({ description: 'Secreto TOTP en Base32' })
  secret: string;

  @ApiProperty({ description: 'URL otpauth:// para generar QR' })
  qrCodeUrl: string;

  @ApiProperty({ description: 'Códigos de respaldo' })
  backupCodes: string[];
}

export class MfaStatusResponseDto {
  @ApiProperty({ description: 'MFA habilitado' })
  enabled: boolean;

  @ApiProperty({ description: 'Códigos de respaldo restantes', required: false })
  backupCodesRemaining?: number;
}

export class MfaVerifyResultDto {
  @ApiProperty({ description: 'Verificación exitosa' })
  valid: boolean;

  @ApiProperty({ description: 'Se usó código de respaldo', required: false })
  usedBackupCode?: boolean;
}

export class MfaLoginDto {
  @ApiProperty({ description: 'Email del usuario' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  email: string;

  @ApiProperty({ description: 'Contraseña' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString({ message: 'La contraseña debe ser texto' })
  password: string;

  @ApiProperty({ description: 'Código MFA (si MFA está habilitado)', required: false })
  @IsOptional()
  @IsString({ message: 'El código MFA debe ser texto' })
  @Length(6, 8, { message: 'El código MFA debe tener entre 6 y 8 caracteres' })
  mfaCode?: string;
}
