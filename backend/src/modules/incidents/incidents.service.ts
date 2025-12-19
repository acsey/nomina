import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { IncidentCategory, IncidentValueType, IncidentStatus } from '@prisma/client';

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Incident Types =====
  async createIncidentType(data: {
    code: string;
    name: string;
    description?: string;
    category: IncidentCategory;
    affectsPayroll?: boolean;
    isDeduction?: boolean;
    defaultValue?: number;
    valueType?: IncidentValueType;
  }) {
    const existing = await this.prisma.incidentType.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new BadRequestException('Ya existe un tipo de incidencia con ese codigo');
    }

    return this.prisma.incidentType.create({
      data: {
        ...data,
        isActive: true,
      },
    });
  }

  async findAllIncidentTypes() {
    return this.prisma.incidentType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findIncidentType(id: string) {
    const type = await this.prisma.incidentType.findUnique({
      where: { id },
    });

    if (!type) {
      throw new NotFoundException('Tipo de incidencia no encontrado');
    }

    return type;
  }

  async updateIncidentType(id: string, data: Partial<{
    name: string;
    description: string;
    category: IncidentCategory;
    affectsPayroll: boolean;
    isDeduction: boolean;
    defaultValue: number;
    valueType: IncidentValueType;
  }>) {
    await this.findIncidentType(id);

    return this.prisma.incidentType.update({
      where: { id },
      data,
    });
  }

  async deleteIncidentType(id: string) {
    await this.findIncidentType(id);

    return this.prisma.incidentType.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ===== Employee Incidents =====
  async createIncident(data: {
    employeeId: string;
    incidentTypeId: string;
    date: Date | string;
    value: number;
    description?: string;
    documentPath?: string;
  }) {
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;

    return this.prisma.employeeIncident.create({
      data: {
        ...data,
        date,
        status: IncidentStatus.PENDING,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        incidentType: true,
      },
    });
  }

  async findAllIncidents(filters?: {
    employeeId?: string;
    incidentTypeId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: IncidentStatus;
  }) {
    return this.prisma.employeeIncident.findMany({
      where: {
        ...(filters?.employeeId && { employeeId: filters.employeeId }),
        ...(filters?.incidentTypeId && { incidentTypeId: filters.incidentTypeId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.startDate && filters?.endDate && {
          date: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            department: {
              select: { name: true },
            },
          },
        },
        incidentType: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findIncident(id: string) {
    const incident = await this.prisma.employeeIncident.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            department: {
              select: { name: true },
            },
          },
        },
        incidentType: true,
      },
    });

    if (!incident) {
      throw new NotFoundException('Incidencia no encontrada');
    }

    return incident;
  }

  async updateIncident(id: string, data: Partial<{
    date: Date | string;
    value: number;
    description: string;
    documentPath: string;
  }>) {
    await this.findIncident(id);

    const updateData: any = { ...data };
    if (data.date) {
      updateData.date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    }

    return this.prisma.employeeIncident.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        incidentType: true,
      },
    });
  }

  async approveIncident(id: string, approvedById: string) {
    const incident = await this.findIncident(id);

    if (incident.status !== IncidentStatus.PENDING) {
      throw new BadRequestException('Solo se pueden aprobar incidencias pendientes');
    }

    return this.prisma.employeeIncident.update({
      where: { id },
      data: {
        status: IncidentStatus.APPROVED,
        approvedById,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        incidentType: true,
      },
    });
  }

  async rejectIncident(id: string) {
    const incident = await this.findIncident(id);

    if (incident.status !== IncidentStatus.PENDING) {
      throw new BadRequestException('Solo se pueden rechazar incidencias pendientes');
    }

    return this.prisma.employeeIncident.update({
      where: { id },
      data: {
        status: IncidentStatus.REJECTED,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        incidentType: true,
      },
    });
  }

  async deleteIncident(id: string) {
    const incident = await this.findIncident(id);

    if (incident.status === IncidentStatus.APPLIED) {
      throw new BadRequestException('No se pueden eliminar incidencias ya aplicadas a nomina');
    }

    return this.prisma.employeeIncident.update({
      where: { id },
      data: {
        status: IncidentStatus.CANCELLED,
      },
    });
  }

  async getEmployeeIncidents(employeeId: string, year?: number) {
    const startDate = year ? new Date(year, 0, 1) : undefined;
    const endDate = year ? new Date(year, 11, 31) : undefined;

    return this.prisma.employeeIncident.findMany({
      where: {
        employeeId,
        ...(startDate && endDate && {
          date: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
      include: {
        incidentType: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async getPendingIncidentsForPayroll(companyId: string, startDate: Date, endDate: Date) {
    return this.prisma.employeeIncident.findMany({
      where: {
        status: IncidentStatus.APPROVED,
        payrollPeriodId: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
        employee: {
          companyId,
          status: 'ACTIVE',
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        incidentType: true,
      },
      orderBy: { date: 'asc' },
    });
  }
}
