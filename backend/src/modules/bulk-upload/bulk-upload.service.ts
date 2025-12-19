import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';

export interface UploadResult {
  success: number;
  errors: Array<{ row: number; field: string; message: string }>;
  total: number;
}

@Injectable()
export class BulkUploadService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== TEMPLATES ====================

  async generateEmployeesTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Empleados');

    // Headers
    sheet.columns = [
      { header: 'Numero Empleado*', key: 'employeeNumber', width: 18 },
      { header: 'Nombre*', key: 'firstName', width: 20 },
      { header: 'Segundo Nombre', key: 'middleName', width: 20 },
      { header: 'Apellido Paterno*', key: 'lastName', width: 20 },
      { header: 'Apellido Materno', key: 'secondLastName', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Telefono', key: 'phone', width: 15 },
      { header: 'Fecha Nacimiento* (YYYY-MM-DD)', key: 'birthDate', width: 25 },
      { header: 'Genero* (MALE/FEMALE/OTHER)', key: 'gender', width: 25 },
      { header: 'Estado Civil* (SINGLE/MARRIED/DIVORCED/WIDOWED/COHABITING)', key: 'maritalStatus', width: 45 },
      { header: 'RFC*', key: 'rfc', width: 15 },
      { header: 'CURP*', key: 'curp', width: 20 },
      { header: 'NSS', key: 'nss', width: 15 },
      { header: 'Direccion', key: 'address', width: 40 },
      { header: 'Colonia', key: 'colony', width: 25 },
      { header: 'Ciudad', key: 'city', width: 20 },
      { header: 'Estado', key: 'state', width: 20 },
      { header: 'Codigo Postal', key: 'zipCode', width: 15 },
      { header: 'Fecha Ingreso* (YYYY-MM-DD)', key: 'hireDate', width: 25 },
      { header: 'Tipo Contrato* (INDEFINITE/FIXED_TERM/SEASONAL/TRIAL_PERIOD/TRAINING)', key: 'contractType', width: 55 },
      { header: 'Tipo Empleo* (FULL_TIME/PART_TIME/HOURLY)', key: 'employmentType', width: 35 },
      { header: 'Nombre Departamento*', key: 'departmentName', width: 25 },
      { header: 'Nombre Puesto*', key: 'jobPositionName', width: 25 },
      { header: 'Salario Base*', key: 'baseSalary', width: 15 },
      { header: 'Tipo Salario* (MONTHLY/BIWEEKLY/WEEKLY/DAILY/HOURLY)', key: 'salaryType', width: 45 },
      { header: 'Metodo Pago* (TRANSFER/CHECK/CASH)', key: 'paymentMethod', width: 30 },
      { header: 'Codigo Banco', key: 'bankCode', width: 15 },
      { header: 'Cuenta Bancaria', key: 'bankAccount', width: 20 },
      { header: 'CLABE', key: 'clabe', width: 20 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add example row
    sheet.addRow({
      employeeNumber: 'EMP001',
      firstName: 'Juan',
      middleName: '',
      lastName: 'Perez',
      secondLastName: 'Garcia',
      email: 'juan.perez@empresa.com',
      phone: '5551234567',
      birthDate: '1990-05-15',
      gender: 'MALE',
      maritalStatus: 'SINGLE',
      rfc: 'PEGJ900515XXX',
      curp: 'PEGJ900515HDFRRC09',
      nss: '12345678901',
      address: 'Calle Principal 123',
      colony: 'Centro',
      city: 'Ciudad de Mexico',
      state: 'CDMX',
      zipCode: '06000',
      hireDate: '2024-01-15',
      contractType: 'INDEFINITE',
      employmentType: 'FULL_TIME',
      departmentName: 'Recursos Humanos',
      jobPositionName: 'Analista',
      baseSalary: 15000,
      salaryType: 'MONTHLY',
      paymentMethod: 'TRANSFER',
      bankCode: 'BANAMEX',
      bankAccount: '1234567890',
      clabe: '012345678901234567',
    });

    // Add instructions sheet
    const instructionsSheet = workbook.addWorksheet('Instrucciones');
    instructionsSheet.getColumn(1).width = 100;
    instructionsSheet.addRow(['INSTRUCCIONES PARA CARGA MASIVA DE EMPLEADOS']);
    instructionsSheet.addRow(['']);
    instructionsSheet.addRow(['1. Los campos marcados con * son obligatorios']);
    instructionsSheet.addRow(['2. Las fechas deben estar en formato YYYY-MM-DD (ej: 2024-01-15)']);
    instructionsSheet.addRow(['3. Los valores de enumeracion deben coincidir exactamente con los indicados en el encabezado']);
    instructionsSheet.addRow(['4. El departamento y puesto deben existir previamente en el sistema']);
    instructionsSheet.addRow(['5. El codigo de banco debe coincidir con los bancos registrados en el sistema']);
    instructionsSheet.addRow(['6. La fila 2 contiene un ejemplo que debe ser eliminado antes de cargar']);
    instructionsSheet.getRow(1).font = { bold: true, size: 14 };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateCompaniesTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Empresas');

    sheet.columns = [
      { header: 'Nombre*', key: 'name', width: 30 },
      { header: 'RFC*', key: 'rfc', width: 15 },
      { header: 'Registro Patronal IMSS', key: 'registroPatronal', width: 20 },
      { header: 'Registro Patronal ISSSTE', key: 'registroPatronalIssste', width: 20 },
      { header: 'Direccion', key: 'address', width: 40 },
      { header: 'Ciudad', key: 'city', width: 20 },
      { header: 'Estado', key: 'state', width: 20 },
      { header: 'Codigo Postal', key: 'zipCode', width: 15 },
      { header: 'Telefono', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    sheet.addRow({
      name: 'Mi Empresa SA de CV',
      rfc: 'MEE123456XXX',
      registroPatronal: 'Y12-34567-89-0',
      registroPatronalIssste: '',
      address: 'Av. Reforma 123',
      city: 'Ciudad de Mexico',
      state: 'CDMX',
      zipCode: '06600',
      phone: '5555551234',
      email: 'contacto@miempresa.com',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateDepartmentsTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Departamentos');

    sheet.columns = [
      { header: 'Nombre*', key: 'name', width: 30 },
      { header: 'Descripcion', key: 'description', width: 50 },
      { header: 'RFC Empresa*', key: 'companyRfc', width: 15 },
      { header: 'Departamento Padre', key: 'parentName', width: 30 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    sheet.addRow({
      name: 'Recursos Humanos',
      description: 'Departamento de Recursos Humanos',
      companyRfc: 'MEE123456XXX',
      parentName: '',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateBenefitsTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Prestaciones');

    sheet.columns = [
      { header: 'Nombre*', key: 'name', width: 30 },
      { header: 'Descripcion', key: 'description', width: 50 },
      { header: 'Tipo* (FOOD_VOUCHERS/SAVINGS_FUND/BONUS/LIFE_INSURANCE/MAJOR_MEDICAL/PRODUCTIVITY_BONUS/ATTENDANCE_BONUS/PUNCTUALITY_BONUS/TRANSPORTATION/OTHER)', key: 'type', width: 100 },
      { header: 'Valor', key: 'value', width: 15 },
      { header: 'Tipo Valor* (FIXED_AMOUNT/PERCENTAGE_SALARY/DAYS_SALARY)', key: 'valueType', width: 45 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    sheet.addRow({
      name: 'Vales de Despensa',
      description: '10% del salario en vales',
      type: 'FOOD_VOUCHERS',
      value: 10,
      valueType: 'PERCENTAGE_SALARY',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateJobPositionsTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Puestos');

    sheet.columns = [
      { header: 'Nombre*', key: 'name', width: 30 },
      { header: 'Descripcion', key: 'description', width: 50 },
      { header: 'Salario Minimo', key: 'minSalary', width: 15 },
      { header: 'Salario Maximo', key: 'maxSalary', width: 15 },
      { header: 'Nivel Riesgo* (CLASE_I/CLASE_II/CLASE_III/CLASE_IV/CLASE_V)', key: 'riskLevel', width: 50 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    sheet.addRow({
      name: 'Gerente de Proyecto',
      description: 'Gestiona proyectos de desarrollo',
      minSalary: 25000,
      maxSalary: 45000,
      riskLevel: 'CLASE_I',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ==================== IMPORTS ====================

  async importEmployees(fileBuffer: Buffer, companyId: string): Promise<UploadResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const sheet = workbook.getWorksheet('Empleados');
    if (!sheet) {
      throw new BadRequestException('No se encontro la hoja "Empleados" en el archivo');
    }

    const result: UploadResult = { success: 0, errors: [], total: 0 };
    const rows: any[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      rows.push({ rowNumber, values: row.values });
    });

    result.total = rows.length;

    for (const { rowNumber, values } of rows) {
      try {
        const employeeData = {
          employeeNumber: String(values[1] || '').trim(),
          firstName: String(values[2] || '').trim(),
          middleName: values[3] ? String(values[3]).trim() : null,
          lastName: String(values[4] || '').trim(),
          secondLastName: values[5] ? String(values[5]).trim() : null,
          email: values[6] ? String(values[6]).trim() : null,
          phone: values[7] ? String(values[7]).trim() : null,
          birthDate: values[8] ? new Date(values[8]) : null,
          gender: String(values[9] || '').trim() as any,
          maritalStatus: String(values[10] || '').trim() as any,
          rfc: String(values[11] || '').trim(),
          curp: String(values[12] || '').trim(),
          nss: values[13] ? String(values[13]).trim() : null,
          address: values[14] ? String(values[14]).trim() : null,
          colony: values[15] ? String(values[15]).trim() : null,
          city: values[16] ? String(values[16]).trim() : null,
          state: values[17] ? String(values[17]).trim() : null,
          zipCode: values[18] ? String(values[18]).trim() : null,
          hireDate: values[19] ? new Date(values[19]) : null,
          contractType: String(values[20] || '').trim() as any,
          employmentType: String(values[21] || '').trim() as any,
          departmentName: String(values[22] || '').trim(),
          jobPositionName: String(values[23] || '').trim(),
          baseSalary: Number(values[24]) || 0,
          salaryType: String(values[25] || '').trim() as any,
          paymentMethod: String(values[26] || '').trim() as any,
          bankCode: values[27] ? String(values[27]).trim() : null,
          bankAccount: values[28] ? String(values[28]).trim() : null,
          clabe: values[29] ? String(values[29]).trim() : null,
        };

        // Validations
        if (!employeeData.employeeNumber) {
          result.errors.push({ row: rowNumber, field: 'employeeNumber', message: 'Numero de empleado requerido' });
          continue;
        }
        if (!employeeData.firstName) {
          result.errors.push({ row: rowNumber, field: 'firstName', message: 'Nombre requerido' });
          continue;
        }
        if (!employeeData.lastName) {
          result.errors.push({ row: rowNumber, field: 'lastName', message: 'Apellido paterno requerido' });
          continue;
        }
        if (!employeeData.rfc) {
          result.errors.push({ row: rowNumber, field: 'rfc', message: 'RFC requerido' });
          continue;
        }
        if (!employeeData.curp) {
          result.errors.push({ row: rowNumber, field: 'curp', message: 'CURP requerido' });
          continue;
        }

        // Find department
        const department = await this.prisma.department.findFirst({
          where: { name: employeeData.departmentName, companyId },
        });
        if (!department) {
          result.errors.push({ row: rowNumber, field: 'departmentName', message: `Departamento "${employeeData.departmentName}" no encontrado` });
          continue;
        }

        // Find job position
        const jobPosition = await this.prisma.jobPosition.findFirst({
          where: { name: employeeData.jobPositionName },
        });
        if (!jobPosition) {
          result.errors.push({ row: rowNumber, field: 'jobPositionName', message: `Puesto "${employeeData.jobPositionName}" no encontrado` });
          continue;
        }

        // Find bank if provided
        let bankId = null;
        if (employeeData.bankCode) {
          const bank = await this.prisma.bank.findFirst({
            where: { code: employeeData.bankCode },
          });
          if (!bank) {
            result.errors.push({ row: rowNumber, field: 'bankCode', message: `Banco "${employeeData.bankCode}" no encontrado` });
            continue;
          }
          bankId = bank.id;
        }

        // Create employee
        await this.prisma.employee.create({
          data: {
            employeeNumber: employeeData.employeeNumber,
            firstName: employeeData.firstName,
            middleName: employeeData.middleName,
            lastName: employeeData.lastName,
            secondLastName: employeeData.secondLastName,
            email: employeeData.email,
            phone: employeeData.phone,
            birthDate: employeeData.birthDate!,
            gender: employeeData.gender,
            maritalStatus: employeeData.maritalStatus,
            rfc: employeeData.rfc,
            curp: employeeData.curp,
            nss: employeeData.nss,
            address: employeeData.address,
            colony: employeeData.colony,
            city: employeeData.city,
            state: employeeData.state,
            zipCode: employeeData.zipCode,
            hireDate: employeeData.hireDate!,
            contractType: employeeData.contractType,
            employmentType: employeeData.employmentType,
            departmentId: department.id,
            jobPositionId: jobPosition.id,
            companyId,
            baseSalary: employeeData.baseSalary,
            salaryType: employeeData.salaryType,
            paymentMethod: employeeData.paymentMethod,
            bankId,
            bankAccount: employeeData.bankAccount,
            clabe: employeeData.clabe,
          },
        });

        result.success++;
      } catch (error: any) {
        result.errors.push({
          row: rowNumber,
          field: 'general',
          message: error.message || 'Error desconocido',
        });
      }
    }

    return result;
  }

  async importCompanies(fileBuffer: Buffer): Promise<UploadResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const sheet = workbook.getWorksheet('Empresas');
    if (!sheet) {
      throw new BadRequestException('No se encontro la hoja "Empresas" en el archivo');
    }

    const result: UploadResult = { success: 0, errors: [], total: 0 };
    const rows: any[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      rows.push({ rowNumber, values: row.values });
    });

    result.total = rows.length;

    for (const { rowNumber, values } of rows) {
      try {
        const companyData = {
          name: String(values[1] || '').trim(),
          rfc: String(values[2] || '').trim(),
          registroPatronal: values[3] ? String(values[3]).trim() : null,
          registroPatronalIssste: values[4] ? String(values[4]).trim() : null,
          address: values[5] ? String(values[5]).trim() : null,
          city: values[6] ? String(values[6]).trim() : null,
          state: values[7] ? String(values[7]).trim() : null,
          zipCode: values[8] ? String(values[8]).trim() : null,
          phone: values[9] ? String(values[9]).trim() : null,
          email: values[10] ? String(values[10]).trim() : null,
        };

        if (!companyData.name) {
          result.errors.push({ row: rowNumber, field: 'name', message: 'Nombre requerido' });
          continue;
        }
        if (!companyData.rfc) {
          result.errors.push({ row: rowNumber, field: 'rfc', message: 'RFC requerido' });
          continue;
        }

        await this.prisma.company.create({ data: companyData });
        result.success++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          result.errors.push({ row: rowNumber, field: 'rfc', message: 'RFC ya existe' });
        } else {
          result.errors.push({ row: rowNumber, field: 'general', message: error.message });
        }
      }
    }

    return result;
  }

  async importDepartments(fileBuffer: Buffer): Promise<UploadResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const sheet = workbook.getWorksheet('Departamentos');
    if (!sheet) {
      throw new BadRequestException('No se encontro la hoja "Departamentos" en el archivo');
    }

    const result: UploadResult = { success: 0, errors: [], total: 0 };
    const rows: any[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      rows.push({ rowNumber, values: row.values });
    });

    result.total = rows.length;

    for (const { rowNumber, values } of rows) {
      try {
        const deptData = {
          name: String(values[1] || '').trim(),
          description: values[2] ? String(values[2]).trim() : null,
          companyRfc: String(values[3] || '').trim(),
          parentName: values[4] ? String(values[4]).trim() : null,
        };

        if (!deptData.name) {
          result.errors.push({ row: rowNumber, field: 'name', message: 'Nombre requerido' });
          continue;
        }
        if (!deptData.companyRfc) {
          result.errors.push({ row: rowNumber, field: 'companyRfc', message: 'RFC de empresa requerido' });
          continue;
        }

        const company = await this.prisma.company.findUnique({
          where: { rfc: deptData.companyRfc },
        });
        if (!company) {
          result.errors.push({ row: rowNumber, field: 'companyRfc', message: `Empresa con RFC "${deptData.companyRfc}" no encontrada` });
          continue;
        }

        let parentId = null;
        if (deptData.parentName) {
          const parent = await this.prisma.department.findFirst({
            where: { name: deptData.parentName, companyId: company.id },
          });
          if (!parent) {
            result.errors.push({ row: rowNumber, field: 'parentName', message: `Departamento padre "${deptData.parentName}" no encontrado` });
            continue;
          }
          parentId = parent.id;
        }

        await this.prisma.department.create({
          data: {
            name: deptData.name,
            description: deptData.description,
            companyId: company.id,
            parentId,
          },
        });
        result.success++;
      } catch (error: any) {
        result.errors.push({ row: rowNumber, field: 'general', message: error.message });
      }
    }

    return result;
  }

  async importBenefits(fileBuffer: Buffer): Promise<UploadResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const sheet = workbook.getWorksheet('Prestaciones');
    if (!sheet) {
      throw new BadRequestException('No se encontro la hoja "Prestaciones" en el archivo');
    }

    const result: UploadResult = { success: 0, errors: [], total: 0 };
    const rows: any[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      rows.push({ rowNumber, values: row.values });
    });

    result.total = rows.length;

    for (const { rowNumber, values } of rows) {
      try {
        const benefitData = {
          name: String(values[1] || '').trim(),
          description: values[2] ? String(values[2]).trim() : null,
          type: String(values[3] || '').trim() as any,
          value: values[4] ? Number(values[4]) : null,
          valueType: String(values[5] || '').trim() as any,
        };

        if (!benefitData.name) {
          result.errors.push({ row: rowNumber, field: 'name', message: 'Nombre requerido' });
          continue;
        }
        if (!benefitData.type) {
          result.errors.push({ row: rowNumber, field: 'type', message: 'Tipo requerido' });
          continue;
        }
        if (!benefitData.valueType) {
          result.errors.push({ row: rowNumber, field: 'valueType', message: 'Tipo de valor requerido' });
          continue;
        }

        await this.prisma.benefit.create({ data: benefitData });
        result.success++;
      } catch (error: any) {
        result.errors.push({ row: rowNumber, field: 'general', message: error.message });
      }
    }

    return result;
  }

  async importJobPositions(fileBuffer: Buffer): Promise<UploadResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const sheet = workbook.getWorksheet('Puestos');
    if (!sheet) {
      throw new BadRequestException('No se encontro la hoja "Puestos" en el archivo');
    }

    const result: UploadResult = { success: 0, errors: [], total: 0 };
    const rows: any[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      rows.push({ rowNumber, values: row.values });
    });

    result.total = rows.length;

    for (const { rowNumber, values } of rows) {
      try {
        const positionData = {
          name: String(values[1] || '').trim(),
          description: values[2] ? String(values[2]).trim() : null,
          minSalary: values[3] ? Number(values[3]) : null,
          maxSalary: values[4] ? Number(values[4]) : null,
          riskLevel: String(values[5] || 'CLASE_I').trim() as any,
        };

        if (!positionData.name) {
          result.errors.push({ row: rowNumber, field: 'name', message: 'Nombre requerido' });
          continue;
        }

        await this.prisma.jobPosition.create({ data: positionData });
        result.success++;
      } catch (error: any) {
        result.errors.push({ row: rowNumber, field: 'general', message: error.message });
      }
    }

    return result;
  }
}
