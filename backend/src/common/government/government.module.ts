/**
 * Módulo de Endurecimientos Gubernamentales
 * Cumplimiento: Gobierno MX
 *
 * Incluye:
 * - Control de transiciones de estado
 * - Verificación de integridad de snapshots
 * - Exportación para auditoría externa
 * - Políticas de retención
 */

import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StateTransitionService } from './state-transition.service';
import { SnapshotIntegrityService } from './snapshot-integrity.service';
import { AuditExportService } from './audit-export.service';
import { GovernmentController } from './government.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [GovernmentController],
  providers: [
    StateTransitionService,
    SnapshotIntegrityService,
    AuditExportService,
  ],
  exports: [
    StateTransitionService,
    SnapshotIntegrityService,
    AuditExportService,
  ],
})
export class GovernmentModule {}
