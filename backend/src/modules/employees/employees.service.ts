import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Prisma, Gender, MaritalStatus, ContractType, EmploymentType, SalaryType, PaymentMethod } from '@prisma/client';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    const existingRfc = await this.prisma.employee.findUnique({
      where: { rfc: createEmployeeDto.rfc },
    });

    if (existingRfc) {
      throw new ConflictException('Ya existe un empleado con este RFC');
    }

    const existingCurp = await this.prisma.employee.findUnique({
      where: { curp: createEmployeeDto.curp },
    });

    if (existingCurp) {
      throw new ConflictException('Ya existe un empleado con este CURP');
    }

    return this.prisma.employee.create({
      data: {
        employeeNumber: createEmployeeDto.employeeNumber,
        firstName: createEmployeeDto.firstName,
        middleName: createEmployeeDto.middleName,
        lastName: createEmployeeDto.lastName,
        secondLastName: createEmployeeDto.secondLastName,
        email: createEmployeeDto.email,
        phone: createEmployeeDto.phone,
        birthDate: new Date(createEmployeeDto.birthDate),
        gender: createEmployeeDto.gender as Gender,
        maritalStatus: createEmployeeDto.maritalStatus as MaritalStatus,
        rfc: createEmployeeDto.rfc,
        curp: createEmployeeDto.curp,
        nss: createEmployeeDto.nss,
        address: createEmployeeDto.address,
        colony: createEmployeeDto.colony,
        city: createEmployeeDto.city,
        state: createEmployeeDto.state,
        zipCode: createEmployeeDto.zipCode,
        hireDate: new Date(createEmployeeDto.hireDate),
        contractType: createEmployeeDto.contractType as ContractType,
        employmentType: createEmployeeDto.employmentType as EmploymentType,
        baseSalary: createEmployeeDto.baseSalary,
        salaryType: createEmployeeDto.salaryType as SalaryType,
        paymentMethod: createEmployeeDto.paymentMethod as PaymentMethod,
        bankAccount: createEmployeeDto.bankAccount,
        clabe: createEmployeeDto.clabe,
        jobPosition: { connect: { id: createEmployeeDto.jobPositionId } },
        department: { connect: { id: createEmployeeDto.departmentId } },
        company: { connect: { id: createEmployeeDto.companyId } },
        ...(createEmployeeDto.bankId && { bank: { connect: { id: createEmployeeDto.bankId } } }),
        ...(createEmployeeDto.workScheduleId && { workSchedule: { connect: { id: createEmployeeDto.workScheduleId } } }),
      },
      include: {
        department: true,
        jobPosition: true,
        company: true,
      },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    departmentId?: string;
    status?: string;
    companyId?: string;
  }) {
    const { search, departmentId, status, companyId } = params;
    const skip = Number(params.skip) || 0;
    const take = Number(params.take) || 10;

    const where: Prisma.EmployeeWhereInput = {
      isActive: true,
      ...(departmentId && { departmentId }),
      ...(companyId && { companyId }),
      ...(status && { status: status as any }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { employeeNumber: { contains: search, mode: 'insensitive' } },
          { rfc: { contains: search, mode: 'insensitive' } },
          { curp: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take,
        include: {
          department: true,
          jobPosition: true,
        },
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: employees,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        jobPosition: true,
        company: true,
        bank: true,
        workSchedule: true,
        benefits: {
          include: { benefit: true },
        },
        emergencyContacts: true,
        documents: true,
        salaryHistory: {
          orderBy: { effectiveDate: 'desc' },
          take: 5,
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    await this.findOne(id);

    return this.prisma.employee.update({
      where: { id },
      data: updateEmployeeDto as Prisma.EmployeeUpdateInput,
      include: {
        department: true,
        jobPosition: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false, status: 'INACTIVE' },
    });
  }

  async terminate(id: string, terminationDate: Date) {
    await this.findOne(id);

    return this.prisma.employee.update({
      where: { id },
      data: {
        status: 'TERMINATED',
        terminationDate,
        isActive: false,
      },
    });
  }

  async updateSalary(id: string, newSalary: number, reason?: string) {
    const employee = await this.findOne(id);

    await this.prisma.salaryHistory.create({
      data: {
        employeeId: id,
        oldSalary: employee.baseSalary,
        newSalary,
        reason,
        effectiveDate: new Date(),
      },
    });

    return this.prisma.employee.update({
      where: { id },
      data: { baseSalary: newSalary },
    });
  }

  async findByEmail(email: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { email },
      include: {
        department: true,
        jobPosition: true,
        company: true,
        workSchedule: {
          include: {
            scheduleDetails: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado con este email');
    }

    return employee;
  }
}
