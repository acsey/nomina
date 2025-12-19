import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DepartmentCreateInput) {
    return this.prisma.department.create({
      data,
      include: {
        company: true,
        manager: true,
        parent: true,
      },
    });
  }

  async findAll(companyId?: string) {
    return this.prisma.department.findMany({
      where: {
        isActive: true,
        ...(companyId && { companyId }),
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        parent: true,
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        company: true,
        manager: true,
        parent: true,
        children: true,
        employees: {
          where: { isActive: true },
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            jobPosition: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Departamento no encontrado');
    }

    return department;
  }

  async update(id: string, data: Prisma.DepartmentUpdateInput) {
    await this.findOne(id);

    return this.prisma.department.update({
      where: { id },
      data,
      include: {
        company: true,
        manager: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
