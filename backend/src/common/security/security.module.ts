import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { SecretsService } from './secrets.service';
import { AuditService } from './audit.service';

/**
 * Módulo global de seguridad
 * Proporciona servicios de cifrado, gestión de secretos y auditoría
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [EncryptionService, SecretsService, AuditService],
  exports: [EncryptionService, SecretsService, AuditService],
})
export class SecurityModule {}
