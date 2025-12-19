import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // Crear roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrador del sistema',
      permissions: JSON.stringify([
        'users:read',
        'users:write',
        'users:delete',
        'employees:read',
        'employees:write',
        'employees:delete',
        'payroll:read',
        'payroll:write',
        'payroll:approve',
        'reports:read',
        'reports:export',
        'settings:read',
        'settings:write',
      ]),
    },
  });

  const rhRole = await prisma.role.upsert({
    where: { name: 'rh' },
    update: {},
    create: {
      name: 'rh',
      description: 'Recursos Humanos',
      permissions: JSON.stringify([
        'employees:read',
        'employees:write',
        'payroll:read',
        'payroll:write',
        'reports:read',
        'reports:export',
      ]),
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'manager' },
    update: {},
    create: {
      name: 'manager',
      description: 'Gerente de departamento',
      permissions: JSON.stringify([
        'employees:read',
        'payroll:read',
        'reports:read',
      ]),
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'employee' },
    update: {},
    create: {
      name: 'employee',
      description: 'Empleado',
      permissions: JSON.stringify([
        'profile:read',
        'payroll:read:own',
      ]),
    },
  });

  console.log('✅ Roles creados');

  // Crear usuario administrador
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@empresa.com' },
    update: {},
    create: {
      email: 'admin@empresa.com',
      password: hashedPassword,
      firstName: 'Administrador',
      lastName: 'Sistema',
      roleId: adminRole.id,
    },
  });

  console.log('✅ Usuario administrador creado');

  // Crear empresa demo
  const company = await prisma.company.upsert({
    where: { rfc: 'XAXX010101000' },
    update: {},
    create: {
      name: 'Empresa Demo S.A. de C.V.',
      rfc: 'XAXX010101000',
      registroPatronal: 'Y12345678901',
      address: 'Av. Reforma 123',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '06600',
      phone: '55 1234 5678',
      email: 'contacto@empresademo.com',
    },
  });

  console.log('✅ Empresa demo creada');

  // Crear departamentos
  const rhDept = await prisma.department.create({
    data: {
      name: 'Recursos Humanos',
      description: 'Departamento de Recursos Humanos',
      companyId: company.id,
    },
  });

  const finanzasDept = await prisma.department.create({
    data: {
      name: 'Finanzas',
      description: 'Departamento de Finanzas y Contabilidad',
      companyId: company.id,
    },
  });

  const operacionesDept = await prisma.department.create({
    data: {
      name: 'Operaciones',
      description: 'Departamento de Operaciones',
      companyId: company.id,
    },
  });

  const tiDept = await prisma.department.create({
    data: {
      name: 'Tecnología',
      description: 'Departamento de Tecnología de la Información',
      companyId: company.id,
    },
  });

  console.log('✅ Departamentos creados');

  // Crear puestos
  const puestos = await Promise.all([
    prisma.jobPosition.create({
      data: {
        name: 'Gerente General',
        description: 'Dirección general de la empresa',
        minSalary: 50000,
        maxSalary: 100000,
        riskLevel: 'CLASE_I',
      },
    }),
    prisma.jobPosition.create({
      data: {
        name: 'Gerente de Recursos Humanos',
        description: 'Gestión del personal',
        minSalary: 35000,
        maxSalary: 60000,
        riskLevel: 'CLASE_I',
      },
    }),
    prisma.jobPosition.create({
      data: {
        name: 'Contador',
        description: 'Contabilidad y finanzas',
        minSalary: 20000,
        maxSalary: 40000,
        riskLevel: 'CLASE_I',
      },
    }),
    prisma.jobPosition.create({
      data: {
        name: 'Desarrollador de Software',
        description: 'Desarrollo de aplicaciones',
        minSalary: 25000,
        maxSalary: 60000,
        riskLevel: 'CLASE_I',
      },
    }),
    prisma.jobPosition.create({
      data: {
        name: 'Operador',
        description: 'Operaciones generales',
        minSalary: 8000,
        maxSalary: 15000,
        riskLevel: 'CLASE_II',
      },
    }),
  ]);

  console.log('✅ Puestos creados');

  // Crear bancos
  const bancos = await Promise.all([
    prisma.bank.upsert({
      where: { code: '002' },
      update: {},
      create: { code: '002', name: 'BANAMEX' },
    }),
    prisma.bank.upsert({
      where: { code: '012' },
      update: {},
      create: { code: '012', name: 'BBVA MEXICO' },
    }),
    prisma.bank.upsert({
      where: { code: '014' },
      update: {},
      create: { code: '014', name: 'SANTANDER' },
    }),
    prisma.bank.upsert({
      where: { code: '021' },
      update: {},
      create: { code: '021', name: 'HSBC' },
    }),
    prisma.bank.upsert({
      where: { code: '072' },
      update: {},
      create: { code: '072', name: 'BANORTE' },
    }),
  ]);

  console.log('✅ Bancos creados');

  // Crear conceptos de nómina
  const conceptos = await Promise.all([
    // Percepciones
    prisma.payrollConcept.upsert({
      where: { code: 'P001' },
      update: {},
      create: {
        code: 'P001',
        name: 'Sueldo',
        type: 'PERCEPTION',
        satCode: '001',
        isTaxable: true,
        isFixed: true,
      },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P002' },
      update: {},
      create: {
        code: 'P002',
        name: 'Horas Extra',
        type: 'PERCEPTION',
        satCode: '019',
        isTaxable: true,
        isFixed: false,
      },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P003' },
      update: {},
      create: {
        code: 'P003',
        name: 'Prima Vacacional',
        type: 'PERCEPTION',
        satCode: '021',
        isTaxable: true,
        isFixed: false,
      },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P004' },
      update: {},
      create: {
        code: 'P004',
        name: 'Aguinaldo',
        type: 'PERCEPTION',
        satCode: '002',
        isTaxable: true,
        isFixed: false,
      },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P005' },
      update: {},
      create: {
        code: 'P005',
        name: 'Bono de Puntualidad',
        type: 'PERCEPTION',
        satCode: '038',
        isTaxable: true,
        isFixed: false,
      },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P006' },
      update: {},
      create: {
        code: 'P006',
        name: 'Bono de Asistencia',
        type: 'PERCEPTION',
        satCode: '038',
        isTaxable: true,
        isFixed: false,
      },
    }),
    // Deducciones
    prisma.payrollConcept.upsert({
      where: { code: 'D001' },
      update: {},
      create: {
        code: 'D001',
        name: 'ISR',
        type: 'DEDUCTION',
        satCode: '002',
        isTaxable: false,
        isFixed: false,
      },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D002' },
      update: {},
      create: {
        code: 'D002',
        name: 'IMSS',
        type: 'DEDUCTION',
        satCode: '001',
        isTaxable: false,
        isFixed: false,
      },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D003' },
      update: {},
      create: {
        code: 'D003',
        name: 'INFONAVIT',
        type: 'DEDUCTION',
        satCode: '010',
        isTaxable: false,
        isFixed: false,
      },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D004' },
      update: {},
      create: {
        code: 'D004',
        name: 'Pensión Alimenticia',
        type: 'DEDUCTION',
        satCode: '007',
        isTaxable: false,
        isFixed: false,
      },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D005' },
      update: {},
      create: {
        code: 'D005',
        name: 'Fondo de Ahorro',
        type: 'DEDUCTION',
        satCode: '004',
        isTaxable: false,
        isFixed: false,
      },
    }),
  ]);

  console.log('✅ Conceptos de nómina creados');

  // Crear prestaciones
  const prestaciones = await Promise.all([
    prisma.benefit.create({
      data: {
        name: 'Vales de Despensa',
        description: 'Vales mensuales para despensa',
        type: 'FOOD_VOUCHERS',
        value: 1500,
        valueType: 'FIXED_AMOUNT',
      },
    }),
    prisma.benefit.create({
      data: {
        name: 'Fondo de Ahorro',
        description: 'Ahorro del 5% del salario',
        type: 'SAVINGS_FUND',
        value: 5,
        valueType: 'PERCENTAGE_SALARY',
      },
    }),
    prisma.benefit.create({
      data: {
        name: 'Bono de Puntualidad',
        description: 'Bono mensual por asistencia puntual',
        type: 'PUNCTUALITY_BONUS',
        value: 500,
        valueType: 'FIXED_AMOUNT',
      },
    }),
    prisma.benefit.create({
      data: {
        name: 'Bono de Asistencia',
        description: 'Bono mensual por asistencia perfecta',
        type: 'ATTENDANCE_BONUS',
        value: 500,
        valueType: 'FIXED_AMOUNT',
      },
    }),
    prisma.benefit.create({
      data: {
        name: 'Seguro de Vida',
        description: 'Seguro de vida básico',
        type: 'LIFE_INSURANCE',
        value: 12,
        valueType: 'DAYS_SALARY',
      },
    }),
  ]);

  console.log('✅ Prestaciones creadas');

  // Crear días festivos 2024
  const diasFestivos2024 = [
    { name: 'Año Nuevo', date: new Date('2024-01-01') },
    { name: 'Día de la Constitución', date: new Date('2024-02-05') },
    { name: 'Natalicio de Benito Juárez', date: new Date('2024-03-18') },
    { name: 'Día del Trabajo', date: new Date('2024-05-01') },
    { name: 'Día de la Independencia', date: new Date('2024-09-16') },
    { name: 'Día de la Revolución', date: new Date('2024-11-18') },
    { name: 'Transmisión del Poder Ejecutivo', date: new Date('2024-10-01') },
    { name: 'Navidad', date: new Date('2024-12-25') },
  ];

  for (const dia of diasFestivos2024) {
    await prisma.holiday.upsert({
      where: {
        date_year: {
          date: dia.date,
          year: 2024,
        },
      },
      update: {},
      create: {
        name: dia.name,
        date: dia.date,
        year: 2024,
        isNational: true,
        isPaid: true,
      },
    });
  }

  console.log('✅ Días festivos 2024 creados');

  // Crear horario de trabajo estándar
  const workSchedule = await prisma.workSchedule.create({
    data: {
      name: 'Horario Estándar',
      description: 'Lunes a Viernes 9:00 - 18:00',
      scheduleDetails: {
        create: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', breakStart: '14:00', breakEnd: '15:00', isWorkDay: true },
          { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', breakStart: '14:00', breakEnd: '15:00', isWorkDay: true },
          { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', breakStart: '14:00', breakEnd: '15:00', isWorkDay: true },
          { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', breakStart: '14:00', breakEnd: '15:00', isWorkDay: true },
          { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', breakStart: '14:00', breakEnd: '15:00', isWorkDay: true },
          { dayOfWeek: 6, startTime: '00:00', endTime: '00:00', isWorkDay: false },
          { dayOfWeek: 0, startTime: '00:00', endTime: '00:00', isWorkDay: false },
        ],
      },
    },
  });

  console.log('✅ Horario de trabajo creado');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📧 Usuario de prueba:');
  console.log('   Email: admin@empresa.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
