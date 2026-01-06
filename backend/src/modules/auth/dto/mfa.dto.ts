import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaDto {
  @ApiProperty({ description: 'Código TOTP de 6 dígitos', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 8)
  @Matches(/^[0-9A-Z]+$/, { message: 'Código debe ser numérico o alfanumérico' })
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
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Contraseña' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Código MFA (si MFA está habilitado)', required: false })
  @IsString()
  @Length(6, 8)
  mfaCode?: string;
}
