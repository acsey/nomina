import { Module, Global } from '@nestjs/common';
import { RoundingService } from './rounding.service';

/**
 * Módulo global de utilidades
 * Proporciona servicios de redondeo y otras utilidades comunes
 */
@Global()
@Module({
  providers: [RoundingService],
  exports: [RoundingService],
})
export class UtilsModule {}
