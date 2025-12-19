import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ImssService } from './services/imss.service';
import { IssstService } from './services/issste.service';
import { InfonavitService } from './services/infonavit.service';

@Injectable()
export class GovernmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imssService: ImssService,
    private readonly issstService: IssstService,
    private readonly infonavitService: InfonavitService,
  ) {}

  async getImssReport(companyId: string, periodId: string) {
    return this.imssService.generateReport(companyId, periodId);
  }

  async getImssEmployerQuotas(companyId: string, periodId: string) {
    return this.imssService.calculateEmployerQuotas(companyId, periodId);
  }

  async getIssstReport(companyId: string, periodId: string) {
    return this.issstService.generateReport(companyId, periodId);
  }

  async getInfonavitReport(companyId: string, periodId: string) {
    return this.infonavitService.generateReport(companyId, periodId);
  }

  async getSuaFile(companyId: string, periodId: string) {
    // Generar archivo SUA para pago de cuotas IMSS
    return this.imssService.generateSuaFile(companyId, periodId);
  }

  async getIdseMovements(companyId: string, month: number, year: number) {
    // Obtener movimientos IDSE (altas, bajas, modificaciones de salario)
    return this.imssService.getIdseMovements(companyId, month, year);
  }

  async registerImssMovement(data: {
    employeeId: string;
    movementType: 'ALTA' | 'BAJA' | 'MODIFICACION_SALARIO';
    effectiveDate: Date;
    sbc?: number;
    reason?: string;
  }) {
    return this.imssService.registerMovement(data);
  }
}
