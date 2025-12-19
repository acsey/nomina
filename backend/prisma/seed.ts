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

  // Crear conceptos de nómina (completos según SAT)
  const conceptos = await Promise.all([
    // ===========================================
    // PERCEPCIONES (códigos SAT del catálogo CFDI)
    // ===========================================
    prisma.payrollConcept.upsert({
      where: { code: 'P001' },
      update: {},
      create: { code: 'P001', name: 'Sueldo', type: 'PERCEPTION', satCode: '001', isTaxable: true, isFixed: true },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P002' },
      update: {},
      create: { code: 'P002', name: 'Horas Extra', type: 'PERCEPTION', satCode: '019', isTaxable: true, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P003' },
      update: {},
      create: { code: 'P003', name: 'Prima Vacacional', type: 'PERCEPTION', satCode: '021', isTaxable: true, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P004' },
      update: {},
      create: { code: 'P004', name: 'Aguinaldo', type: 'PERCEPTION', satCode: '002', isTaxable: true, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P005' },
      update: {},
      create: { code: 'P005', name: 'Bono de Puntualidad', type: 'PERCEPTION', satCode: '038', isTaxable: true, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P006' },
      update: {},
      create: { code: 'P006', name: 'Bono de Asistencia', type: 'PERCEPTION', satCode: '038', isTaxable: true, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P007' },
      update: {},
      create: { code: 'P007', name: 'Vales de Despensa', type: 'PERCEPTION', satCode: '029', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P008' },
      update: {},
      create: { code: 'P008', name: 'Fondo de Ahorro (Aportación Empresa)', type: 'PERCEPTION', satCode: '005', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P009' },
      update: {},
      create: { code: 'P009', name: 'PTU', type: 'PERCEPTION', satCode: '003', isTaxable: true, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P010' },
      update: {},
      create: { code: 'P010', name: 'Comisiones', type: 'PERCEPTION', satCode: '028', isTaxable: true, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P011' },
      update: {},
      create: { code: 'P011', name: 'Bono de Productividad', type: 'PERCEPTION', satCode: '038', isTaxable: true, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P012' },
      update: {},
      create: { code: 'P012', name: 'Prima Dominical', type: 'PERCEPTION', satCode: '020', isTaxable: true, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P013' },
      update: {},
      create: { code: 'P013', name: 'Gratificación', type: 'PERCEPTION', satCode: '023', isTaxable: true, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P014' },
      update: {},
      create: { code: 'P014', name: 'Subsidio por Incapacidad', type: 'PERCEPTION', satCode: '014', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P015' },
      update: {},
      create: { code: 'P015', name: 'Ayuda de Transporte', type: 'PERCEPTION', satCode: '046', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P016' },
      update: {},
      create: { code: 'P016', name: 'Séptimo Día', type: 'PERCEPTION', satCode: '001', isTaxable: true, isFixed: true },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P017' },
      update: {},
      create: { code: 'P017', name: 'Finiquito', type: 'PERCEPTION', satCode: '022', isTaxable: true, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P018' },
      update: {},
      create: { code: 'P018', name: 'Liquidación', type: 'PERCEPTION', satCode: '025', isTaxable: true, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P019' },
      update: {},
      create: { code: 'P019', name: 'Indemnización', type: 'PERCEPTION', satCode: '025', isTaxable: true, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'P020' },
      update: {},
      create: { code: 'P020', name: 'Pago Retroactivo', type: 'PERCEPTION', satCode: '038', isTaxable: true, isFixed: false },
    }),
    // ===========================================
    // DEDUCCIONES (códigos SAT del catálogo CFDI)
    // ===========================================
    prisma.payrollConcept.upsert({
      where: { code: 'D001' },
      update: {},
      create: { code: 'D001', name: 'ISR', type: 'DEDUCTION', satCode: '002', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D002' },
      update: {},
      create: { code: 'D002', name: 'IMSS (Cuota Obrero)', type: 'DEDUCTION', satCode: '001', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D003' },
      update: {},
      create: { code: 'D003', name: 'INFONAVIT', type: 'DEDUCTION', satCode: '010', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D004' },
      update: {},
      create: { code: 'D004', name: 'Pensión Alimenticia', type: 'DEDUCTION', satCode: '007', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D005' },
      update: {},
      create: { code: 'D005', name: 'Fondo de Ahorro (Aportación Trabajador)', type: 'DEDUCTION', satCode: '004', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D006' },
      update: {},
      create: { code: 'D006', name: 'Préstamo Empresa', type: 'DEDUCTION', satCode: '006', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D007' },
      update: {},
      create: { code: 'D007', name: 'Caja de Ahorro', type: 'DEDUCTION', satCode: '008', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D008' },
      update: {},
      create: { code: 'D008', name: 'Descuento por Falta', type: 'DEDUCTION', satCode: '012', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D009' },
      update: {},
      create: { code: 'D009', name: 'Descuento por Retardo', type: 'DEDUCTION', satCode: '012', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D010' },
      update: {},
      create: { code: 'D010', name: 'Seguro Gastos Médicos', type: 'DEDUCTION', satCode: '011', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D011' },
      update: {},
      create: { code: 'D011', name: 'Cuota Sindical', type: 'DEDUCTION', satCode: '003', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D012' },
      update: {},
      create: { code: 'D012', name: 'Anticipo de Salario', type: 'DEDUCTION', satCode: '012', isTaxable: false, isFixed: false },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'D013' },
      update: {},
      create: { code: 'D013', name: 'Otros Descuentos', type: 'DEDUCTION', satCode: '012', isTaxable: false, isFixed: false },
    }),
  ]);

  console.log('✅ Conceptos de nómina creados');

  // Crear tipos de incidencias
  const incidentTypes = await Promise.all([
    // Faltas y ausencias
    prisma.incidentType.upsert({
      where: { code: 'FALTA' },
      update: {},
      create: { code: 'FALTA', name: 'Falta injustificada', category: 'ABSENCE', affectsPayroll: true, isDeduction: true, valueType: 'DAYS', defaultValue: 1 },
    }),
    prisma.incidentType.upsert({
      where: { code: 'FALTA_JUST' },
      update: {},
      create: { code: 'FALTA_JUST', name: 'Falta justificada', category: 'JUSTIFIED_ABSENCE', affectsPayroll: false, isDeduction: false, valueType: 'DAYS', defaultValue: 1 },
    }),
    // Retardos
    prisma.incidentType.upsert({
      where: { code: 'RETARDO' },
      update: {},
      create: { code: 'RETARDO', name: 'Retardo', category: 'TARDINESS', affectsPayroll: true, isDeduction: true, valueType: 'HOURS', defaultValue: 1 },
    }),
    prisma.incidentType.upsert({
      where: { code: 'RETARDO_GRAVE' },
      update: {},
      create: { code: 'RETARDO_GRAVE', name: 'Retardo grave (mas de 30 min)', category: 'TARDINESS', affectsPayroll: true, isDeduction: true, valueType: 'HOURS', defaultValue: 2 },
    }),
    // Salidas anticipadas
    prisma.incidentType.upsert({
      where: { code: 'SALIDA_ANT' },
      update: {},
      create: { code: 'SALIDA_ANT', name: 'Salida anticipada', category: 'EARLY_LEAVE', affectsPayroll: true, isDeduction: true, valueType: 'HOURS', defaultValue: 1 },
    }),
    // Horas extra
    prisma.incidentType.upsert({
      where: { code: 'HORAS_EXTRA' },
      update: {},
      create: { code: 'HORAS_EXTRA', name: 'Horas extra', category: 'OVERTIME', affectsPayroll: true, isDeduction: false, valueType: 'HOURS', defaultValue: 1 },
    }),
    prisma.incidentType.upsert({
      where: { code: 'HORAS_EXTRA_DOM' },
      update: {},
      create: { code: 'HORAS_EXTRA_DOM', name: 'Horas extra domingo/festivo', category: 'OVERTIME', affectsPayroll: true, isDeduction: false, valueType: 'HOURS', defaultValue: 1 },
    }),
    // Bonos
    prisma.incidentType.upsert({
      where: { code: 'BONO_PUNTUALIDAD' },
      update: {},
      create: { code: 'BONO_PUNTUALIDAD', name: 'Bono de puntualidad', category: 'BONUS', affectsPayroll: true, isDeduction: false, valueType: 'AMOUNT', defaultValue: 500 },
    }),
    prisma.incidentType.upsert({
      where: { code: 'BONO_ASISTENCIA' },
      update: {},
      create: { code: 'BONO_ASISTENCIA', name: 'Bono de asistencia', category: 'BONUS', affectsPayroll: true, isDeduction: false, valueType: 'AMOUNT', defaultValue: 500 },
    }),
    prisma.incidentType.upsert({
      where: { code: 'BONO_PRODUCTIVIDAD' },
      update: {},
      create: { code: 'BONO_PRODUCTIVIDAD', name: 'Bono de productividad', category: 'BONUS', affectsPayroll: true, isDeduction: false, valueType: 'AMOUNT', defaultValue: 1000 },
    }),
    // Descuentos
    prisma.incidentType.upsert({
      where: { code: 'DESCUENTO' },
      update: {},
      create: { code: 'DESCUENTO', name: 'Descuento general', category: 'DEDUCTION', affectsPayroll: true, isDeduction: true, valueType: 'AMOUNT', defaultValue: 0 },
    }),
    prisma.incidentType.upsert({
      where: { code: 'DESCUENTO_UNIFORME' },
      update: {},
      create: { code: 'DESCUENTO_UNIFORME', name: 'Descuento por uniforme', category: 'DEDUCTION', affectsPayroll: true, isDeduction: true, valueType: 'AMOUNT', defaultValue: 0 },
    }),
    // Incapacidades
    prisma.incidentType.upsert({
      where: { code: 'INCAP_ENF' },
      update: {},
      create: { code: 'INCAP_ENF', name: 'Incapacidad por enfermedad', category: 'DISABILITY', affectsPayroll: true, isDeduction: false, valueType: 'DAYS', defaultValue: 1 },
    }),
    prisma.incidentType.upsert({
      where: { code: 'INCAP_ACC' },
      update: {},
      create: { code: 'INCAP_ACC', name: 'Incapacidad por accidente', category: 'DISABILITY', affectsPayroll: true, isDeduction: false, valueType: 'DAYS', defaultValue: 1 },
    }),
    prisma.incidentType.upsert({
      where: { code: 'INCAP_MATERNIDAD' },
      update: {},
      create: { code: 'INCAP_MATERNIDAD', name: 'Incapacidad por maternidad', category: 'DISABILITY', affectsPayroll: true, isDeduction: false, valueType: 'DAYS', defaultValue: 1 },
    }),
  ]);

  console.log('✅ Tipos de incidencias creados');

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

  // Crear horarios de trabajo
  const workSchedule = await prisma.workSchedule.create({
    data: {
      name: 'Horario Oficina',
      description: 'Lunes a Viernes 9:00 - 18:00',
      scheduleDetails: {
        create: [
          { dayOfWeek: 0, startTime: '00:00', endTime: '00:00', isWorkDay: false },
          { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', breakStart: '14:00', breakEnd: '15:00', isWorkDay: true },
          { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', breakStart: '14:00', breakEnd: '15:00', isWorkDay: true },
          { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', breakStart: '14:00', breakEnd: '15:00', isWorkDay: true },
          { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', breakStart: '14:00', breakEnd: '15:00', isWorkDay: true },
          { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', breakStart: '14:00', breakEnd: '15:00', isWorkDay: true },
          { dayOfWeek: 6, startTime: '00:00', endTime: '00:00', isWorkDay: false },
        ],
      },
    },
  });

  const workSchedule6Days = await prisma.workSchedule.create({
    data: {
      name: 'Horario Operaciones',
      description: 'Lunes a Sabado 8:00 - 16:00',
      scheduleDetails: {
        create: [
          { dayOfWeek: 0, startTime: '00:00', endTime: '00:00', isWorkDay: false },
          { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', breakStart: '12:00', breakEnd: '13:00', isWorkDay: true },
          { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', breakStart: '12:00', breakEnd: '13:00', isWorkDay: true },
          { dayOfWeek: 3, startTime: '08:00', endTime: '16:00', breakStart: '12:00', breakEnd: '13:00', isWorkDay: true },
          { dayOfWeek: 4, startTime: '08:00', endTime: '16:00', breakStart: '12:00', breakEnd: '13:00', isWorkDay: true },
          { dayOfWeek: 5, startTime: '08:00', endTime: '16:00', breakStart: '12:00', breakEnd: '13:00', isWorkDay: true },
          { dayOfWeek: 6, startTime: '08:00', endTime: '14:00', isWorkDay: true },
        ],
      },
    },
  });

  const workScheduleMixto = await prisma.workSchedule.create({
    data: {
      name: 'Horario Mixto',
      description: 'Lunes a Viernes + medio Sabado',
      scheduleDetails: {
        create: [
          { dayOfWeek: 0, startTime: '00:00', endTime: '00:00', isWorkDay: false },
          { dayOfWeek: 1, startTime: '08:30', endTime: '17:30', breakStart: '13:00', breakEnd: '14:00', isWorkDay: true },
          { dayOfWeek: 2, startTime: '08:30', endTime: '17:30', breakStart: '13:00', breakEnd: '14:00', isWorkDay: true },
          { dayOfWeek: 3, startTime: '08:30', endTime: '17:30', breakStart: '13:00', breakEnd: '14:00', isWorkDay: true },
          { dayOfWeek: 4, startTime: '08:30', endTime: '17:30', breakStart: '13:00', breakEnd: '14:00', isWorkDay: true },
          { dayOfWeek: 5, startTime: '08:30', endTime: '17:30', breakStart: '13:00', breakEnd: '14:00', isWorkDay: true },
          { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', isWorkDay: true },
        ],
      },
    },
  });

  console.log('✅ Horarios de trabajo creados');

  // Crear empleados de prueba
  const empleados = [
    {
      employeeNumber: 'EMP001',
      firstName: 'Juan',
      lastName: 'García',
      secondLastName: 'López',
      email: 'juan.garcia@empresa.com',
      phone: '55 1234 0001',
      birthDate: new Date('1985-03-15'),
      gender: 'MALE' as const,
      maritalStatus: 'MARRIED' as const,
      rfc: 'GALJ850315ABC',
      curp: 'GALJ850315HDFRPN01',
      nss: '12345678901',
      address: 'Calle Principal 123',
      colony: 'Centro',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '06000',
      hireDate: new Date('2020-01-15'),
      contractType: 'INDEFINITE' as const,
      employmentType: 'FULL_TIME' as const,
      jobPositionId: puestos[0].id, // Gerente General
      departmentId: rhDept.id,
      companyId: company.id,
      workScheduleId: workSchedule.id,
      baseSalary: 75000,
      salaryType: 'MONTHLY' as const,
      paymentMethod: 'TRANSFER' as const,
      bankId: bancos[1].id, // BBVA
      bankAccount: '0123456789',
      clabe: '012345678901234567',
      tipoSalarioImss: 'FIJO' as const,
    },
    {
      employeeNumber: 'EMP002',
      firstName: 'María',
      lastName: 'Rodríguez',
      secondLastName: 'Hernández',
      email: 'maria.rodriguez@empresa.com',
      phone: '55 1234 0002',
      birthDate: new Date('1990-07-22'),
      gender: 'FEMALE' as const,
      maritalStatus: 'SINGLE' as const,
      rfc: 'ROHM900722XYZ',
      curp: 'ROHM900722MDFRDR02',
      nss: '12345678902',
      address: 'Av. Insurgentes 456',
      colony: 'Roma Norte',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '06700',
      hireDate: new Date('2021-03-01'),
      contractType: 'INDEFINITE' as const,
      employmentType: 'FULL_TIME' as const,
      jobPositionId: puestos[1].id, // Gerente RH
      departmentId: rhDept.id,
      companyId: company.id,
      workScheduleId: workSchedule.id,
      baseSalary: 45000,
      salaryType: 'MONTHLY' as const,
      paymentMethod: 'TRANSFER' as const,
      bankId: bancos[0].id, // BANAMEX
      bankAccount: '9876543210',
      clabe: '002345678901234567',
      tipoSalarioImss: 'FIJO' as const,
    },
    {
      employeeNumber: 'EMP003',
      firstName: 'Carlos',
      lastName: 'Martínez',
      secondLastName: 'Sánchez',
      email: 'carlos.martinez@empresa.com',
      phone: '55 1234 0003',
      birthDate: new Date('1988-11-10'),
      gender: 'MALE' as const,
      maritalStatus: 'MARRIED' as const,
      rfc: 'MASC881110DEF',
      curp: 'MASC881110HDFRRR03',
      nss: '12345678903',
      address: 'Calle Reforma 789',
      colony: 'Polanco',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '11550',
      hireDate: new Date('2019-06-15'),
      contractType: 'INDEFINITE' as const,
      employmentType: 'FULL_TIME' as const,
      jobPositionId: puestos[2].id, // Contador
      departmentId: finanzasDept.id,
      companyId: company.id,
      workScheduleId: workSchedule.id,
      baseSalary: 35000,
      salaryType: 'MONTHLY' as const,
      paymentMethod: 'TRANSFER' as const,
      bankId: bancos[2].id, // SANTANDER
      bankAccount: '1111222233',
      clabe: '014345678901234567',
      tipoSalarioImss: 'FIJO' as const,
    },
    {
      employeeNumber: 'EMP004',
      firstName: 'Ana',
      lastName: 'López',
      secondLastName: 'Pérez',
      email: 'ana.lopez@empresa.com',
      phone: '55 1234 0004',
      birthDate: new Date('1992-04-05'),
      gender: 'FEMALE' as const,
      maritalStatus: 'SINGLE' as const,
      rfc: 'LOPA920405GHI',
      curp: 'LOPA920405MDFPPR04',
      nss: '12345678904',
      address: 'Calle Madero 321',
      colony: 'Centro Histórico',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '06010',
      hireDate: new Date('2022-01-10'),
      contractType: 'INDEFINITE' as const,
      employmentType: 'FULL_TIME' as const,
      jobPositionId: puestos[3].id, // Desarrollador
      departmentId: tiDept.id,
      companyId: company.id,
      workScheduleId: workSchedule.id,
      baseSalary: 42000,
      salaryType: 'MONTHLY' as const,
      paymentMethod: 'TRANSFER' as const,
      bankId: bancos[4].id, // BANORTE
      bankAccount: '4444555566',
      clabe: '072345678901234567',
      tipoSalarioImss: 'FIJO' as const,
    },
    {
      employeeNumber: 'EMP005',
      firstName: 'Roberto',
      lastName: 'Hernández',
      secondLastName: 'Díaz',
      email: 'roberto.hernandez@empresa.com',
      phone: '55 1234 0005',
      birthDate: new Date('1995-09-18'),
      gender: 'MALE' as const,
      maritalStatus: 'SINGLE' as const,
      rfc: 'HEDR950918JKL',
      curp: 'HEDR950918HDFRZR05',
      nss: '12345678905',
      address: 'Av. Universidad 555',
      colony: 'Del Valle',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '03100',
      hireDate: new Date('2023-02-20'),
      contractType: 'INDEFINITE' as const,
      employmentType: 'FULL_TIME' as const,
      jobPositionId: puestos[3].id, // Desarrollador
      departmentId: tiDept.id,
      companyId: company.id,
      workScheduleId: workSchedule.id,
      baseSalary: 38000,
      salaryType: 'MONTHLY' as const,
      paymentMethod: 'TRANSFER' as const,
      bankId: bancos[1].id, // BBVA
      bankAccount: '7777888899',
      clabe: '012987654321234567',
      tipoSalarioImss: 'FIJO' as const,
    },
    {
      employeeNumber: 'EMP006',
      firstName: 'Laura',
      lastName: 'Fernández',
      secondLastName: 'Mora',
      email: 'laura.fernandez@empresa.com',
      phone: '55 1234 0006',
      birthDate: new Date('1987-12-03'),
      gender: 'FEMALE' as const,
      maritalStatus: 'DIVORCED' as const,
      rfc: 'FEML871203MNO',
      curp: 'FEML871203MDFRRR06',
      nss: '12345678906',
      address: 'Calle Juárez 888',
      colony: 'Cuauhtémoc',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '06600',
      hireDate: new Date('2018-08-01'),
      contractType: 'INDEFINITE' as const,
      employmentType: 'FULL_TIME' as const,
      jobPositionId: puestos[2].id, // Contador
      departmentId: finanzasDept.id,
      companyId: company.id,
      workScheduleId: workSchedule.id,
      baseSalary: 32000,
      salaryType: 'MONTHLY' as const,
      paymentMethod: 'TRANSFER' as const,
      bankId: bancos[3].id, // HSBC
      bankAccount: '2222333344',
      clabe: '021345678901234567',
      tipoSalarioImss: 'FIJO' as const,
    },
    {
      employeeNumber: 'EMP007',
      firstName: 'Pedro',
      lastName: 'Ramírez',
      secondLastName: 'Vargas',
      email: 'pedro.ramirez@empresa.com',
      phone: '55 1234 0007',
      birthDate: new Date('1993-06-25'),
      gender: 'MALE' as const,
      maritalStatus: 'MARRIED' as const,
      rfc: 'RAVP930625PQR',
      curp: 'RAVP930625HDFMRR07',
      nss: '12345678907',
      address: 'Av. Chapultepec 999',
      colony: 'Condesa',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '06140',
      hireDate: new Date('2021-11-15'),
      contractType: 'INDEFINITE' as const,
      employmentType: 'FULL_TIME' as const,
      jobPositionId: puestos[4].id, // Operador
      departmentId: operacionesDept.id,
      companyId: company.id,
      workScheduleId: workSchedule6Days.id, // Horario de 6 dias
      baseSalary: 12000,
      salaryType: 'MONTHLY' as const,
      paymentMethod: 'TRANSFER' as const,
      bankId: bancos[0].id, // BANAMEX
      bankAccount: '5555666677',
      clabe: '002987654321234567',
      tipoSalarioImss: 'FIJO' as const,
    },
    {
      employeeNumber: 'EMP008',
      firstName: 'Sofía',
      lastName: 'Torres',
      secondLastName: 'Luna',
      email: 'sofia.torres@empresa.com',
      phone: '55 1234 0008',
      birthDate: new Date('1994-02-14'),
      gender: 'FEMALE' as const,
      maritalStatus: 'SINGLE' as const,
      rfc: 'TOLS940214STU',
      curp: 'TOLS940214MDFRRF08',
      nss: '12345678908',
      address: 'Calle Durango 222',
      colony: 'Roma Sur',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '06760',
      hireDate: new Date('2022-07-01'),
      contractType: 'INDEFINITE' as const,
      employmentType: 'FULL_TIME' as const,
      jobPositionId: puestos[4].id, // Operador
      departmentId: operacionesDept.id,
      companyId: company.id,
      workScheduleId: workScheduleMixto.id, // Horario mixto
      baseSalary: 11000,
      salaryType: 'MONTHLY' as const,
      paymentMethod: 'TRANSFER' as const,
      bankId: bancos[2].id, // SANTANDER
      bankAccount: '8888999900',
      clabe: '014111222333444555',
      tipoSalarioImss: 'FIJO' as const,
    },
  ];

  for (const emp of empleados) {
    await prisma.employee.upsert({
      where: { employeeNumber: emp.employeeNumber },
      update: {},
      create: emp,
    });
  }

  console.log('✅ Empleados de prueba creados (8 empleados)');

  // Crear saldos de vacaciones para los empleados
  const currentYear = new Date().getFullYear();
  const createdEmployees = await prisma.employee.findMany();

  for (const emp of createdEmployees) {
    const hireDate = new Date(emp.hireDate);
    const yearsWorked = currentYear - hireDate.getFullYear();
    // Días de vacaciones según LFT México (12 días primer año, +2 por año hasta 20, después +2 cada 5 años)
    let earnedDays = 12;
    if (yearsWorked >= 1) earnedDays = Math.min(12 + (yearsWorked * 2), 20);
    if (yearsWorked >= 5) earnedDays = 20 + Math.floor((yearsWorked - 4) / 5) * 2;

    await prisma.vacationBalance.upsert({
      where: {
        employeeId_year: {
          employeeId: emp.id,
          year: currentYear,
        },
      },
      update: {},
      create: {
        employeeId: emp.id,
        year: currentYear,
        earnedDays,
        usedDays: 0,
        pendingDays: 0,
        expiredDays: 0,
      },
    });
  }

  console.log('✅ Saldos de vacaciones creados');

  // Asignar prestaciones a algunos empleados
  const valesDespensa = prestaciones[0];
  const fondoAhorro = prestaciones[1];

  for (const emp of createdEmployees.slice(0, 5)) {
    await prisma.employeeBenefit.upsert({
      where: {
        employeeId_benefitId: {
          employeeId: emp.id,
          benefitId: valesDespensa.id,
        },
      },
      update: {},
      create: {
        employeeId: emp.id,
        benefitId: valesDespensa.id,
        startDate: new Date(),
      },
    });

    await prisma.employeeBenefit.upsert({
      where: {
        employeeId_benefitId: {
          employeeId: emp.id,
          benefitId: fondoAhorro.id,
        },
      },
      update: {},
      create: {
        employeeId: emp.id,
        benefitId: fondoAhorro.id,
        startDate: new Date(),
      },
    });
  }

  console.log('✅ Prestaciones asignadas a empleados');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📧 Usuario de prueba:');
  console.log('   Email: admin@empresa.com');
  console.log('   Password: admin123');
  console.log('\n👥 Empleados de prueba: 8 empleados en diferentes departamentos');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
