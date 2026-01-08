import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BenefitType, BenefitValueType, BenefitStatus } from '@/common/types/prisma-enums';

@Injectable()
export class BenefitsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBenefit(data: {
    name: string;
    description?: string;
    detailedDescription?: string;
    includes?: string[];
    termsAndConditions?: string;
    pdfDocumentPath?: string;
    type: BenefitType;
    value?: number;
    valueType: BenefitValueType;
    createdById: string;
    isAdmin: boolean;
  }) {
    const { isAdmin, createdById, ...benefitData } = data;

    return this.prisma.benefit.create({
      data: {
        ...benefitData,
        isActive: true,
        createdById,
        // Si es admin, se aprueba automáticamente
        status: isAdmin ? 'APPROVED' : 'PENDING',
        approvedById: isAdmin ? createdById : null,
        approvedAt: isAdmin ? new Date() : null,
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        approvedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  async findAllBenefits(includeAll = false) {
    return this.prisma.benefit.findMany({
      where: includeAll ? { isActive: true } : { isActive: true, status: 'APPROVED' },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        approvedBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findPendingBenefits() {
    return this.prisma.benefit.findMany({
      where: { isActive: true, status: 'PENDING' },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveBenefit(id: string, approvedById: string) {
    const benefit = await this.prisma.benefit.findUnique({
      where: { id },
    });

    if (!benefit) {
      throw new NotFoundException('Prestación no encontrada');
    }

    if (benefit.status !== 'PENDING') {
      throw new ForbiddenException('Solo se pueden aprobar prestaciones pendientes');
    }

    return this.prisma.benefit.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        approvedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  async rejectBenefit(id: string, reason: string) {
    const benefit = await this.prisma.benefit.findUnique({
      where: { id },
    });

    if (!benefit) {
      throw new NotFoundException('Prestación no encontrada');
    }

    if (benefit.status !== 'PENDING') {
      throw new ForbiddenException('Solo se pueden rechazar prestaciones pendientes');
    }

    return this.prisma.benefit.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
      },
    });
  }

  async findBenefit(id: string) {
    const benefit = await this.prisma.benefit.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        approvedBy: {
          select: { firstName: true, lastName: true },
        },
        employeeBenefits: {
          where: { isActive: true },
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!benefit) {
      throw new NotFoundException('Prestación no encontrada');
    }

    return benefit;
  }

  async updateBenefit(id: string, data: Partial<{
    name: string;
    description: string;
    detailedDescription: string;
    includes: string[];
    termsAndConditions: string;
    pdfDocumentPath: string;
    type: BenefitType;
    value: number;
    valueType: BenefitValueType;
  }>) {
    await this.findBenefit(id);

    return this.prisma.benefit.update({
      where: { id },
      data,
    });
  }

  async deleteBenefit(id: string) {
    await this.findBenefit(id);

    return this.prisma.benefit.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async assignBenefitToEmployee(data: {
    employeeId: string;
    benefitId: string;
    customValue?: number;
    startDate: Date;
    endDate?: Date;
  }) {
    return this.prisma.employeeBenefit.upsert({
      where: {
        employeeId_benefitId: {
          employeeId: data.employeeId,
          benefitId: data.benefitId,
        },
      },
      create: {
        ...data,
        isActive: true,
      },
      update: {
        customValue: data.customValue,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: true,
      },
      include: {
        benefit: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async removeEmployeeBenefit(employeeId: string, benefitId: string) {
    return this.prisma.employeeBenefit.update({
      where: {
        employeeId_benefitId: {
          employeeId,
          benefitId,
        },
      },
      data: { isActive: false },
    });
  }

  async getEmployeeBenefits(employeeId: string) {
    return this.prisma.employeeBenefit.findMany({
      where: {
        employeeId,
        isActive: true,
      },
      include: {
        benefit: true,
      },
    });
  }

  async calculateBenefitValue(
    benefit: { value: number | null; valueType: BenefitValueType },
    baseSalary: number,
    customValue?: number,
  ): Promise<number> {
    const value = customValue ?? benefit.value ?? 0;

    switch (benefit.valueType) {
      case 'FIXED_AMOUNT':
        return value;
      case 'PERCENTAGE_SALARY':
        return baseSalary * (value / 100);
      case 'DAYS_SALARY':
        return (baseSalary / 30) * value;
      default:
        return 0;
    }
  }
}
