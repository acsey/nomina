import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { SecretsService } from './secrets.service';
import { AuditService } from './audit.service';
import { SodService } from './sod.service';

/**
 * Módulo global de seguridad
 * Proporciona servicios de:
 * - Cifrado y gestión de secretos
 * - Auditoría con hash encadenado (P0.3)
 * - Segregación de funciones - SoD (P0.2)
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [EncryptionService, SecretsService, AuditService, SodService],
  exports: [EncryptionService, SecretsService, AuditService, SodService],
})
export class SecurityModule {}
