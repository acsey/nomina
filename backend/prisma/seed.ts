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
        'users:read', 'users:write', 'users:delete',
        'employees:read', 'employees:write', 'employees:delete',
        'payroll:read', 'payroll:write', 'payroll:approve',
        'reports:read', 'reports:export',
        'settings:read', 'settings:write',
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
        'employees:read', 'employees:write',
        'payroll:read', 'payroll:write',
        'reports:read', 'reports:export',
      ]),
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'manager' },
    update: {},
    create: {
      name: 'manager',
      description: 'Gerente de departamento',
      permissions: JSON.stringify(['employees:read', 'payroll:read', 'reports:read']),
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'employee' },
    update: {},
    create: {
      name: 'employee',
      description: 'Empleado',
      permissions: JSON.stringify(['profile:read', 'payroll:read:own']),
    },
  });

  console.log('✅ Roles creados');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Crear usuario super administrador (sin empresa)
  await prisma.user.upsert({
    where: { email: 'admin@sistema.com' },
    update: {},
    create: {
      email: 'admin@sistema.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Administrador',
      roleId: adminRole.id,
    },
  });

  console.log('✅ Usuario super administrador creado');

  // ============================================
  // CREAR 3 EMPRESAS CON DIFERENTES CONFIGURACIONES
  // ============================================

  // Empresa 1: BFS Ingeniería (basada en el XML de ejemplo)
  const bfsCompany = await prisma.company.upsert({
    where: { rfc: 'BIA191106ET2' },
    update: {},
    create: {
      name: 'BFS Ingeniería Aplicada S.A. de C.V.',
      rfc: 'BIA191106ET2',
      registroPatronal: 'Y5481967106',
      regimenFiscal: '601',
      address: 'Av. Tecnológico 500',
      city: 'Aguascalientes',
      state: 'AGS',
      zipCode: '20328',
      phone: '449 123 4567',
      email: 'contacto@bfs.com.mx',
      primaryColor: '#0066CC',
      secondaryColor: '#00AAFF',
      pacProvider: 'FINKOK',
      pacMode: 'sandbox',
    },
  });

  // Empresa 2: Tech Solutions
  const techCompany = await prisma.company.upsert({
    where: { rfc: 'TSO201215ABC' },
    update: {},
    create: {
      name: 'Tech Solutions México S.A. de C.V.',
      rfc: 'TSO201215ABC',
      registroPatronal: 'Y1234567890',
      regimenFiscal: '601',
      address: 'Av. Reforma 222',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '06600',
      phone: '55 9876 5432',
      email: 'info@techsolutions.mx',
      primaryColor: '#7C3AED',
      secondaryColor: '#A78BFA',
      pacProvider: 'FINKOK',
      pacMode: 'sandbox',
    },
  });

  // Empresa 3: Comercializadora del Norte
  const norteCompany = await prisma.company.upsert({
    where: { rfc: 'CNO180520XYZ' },
    update: {},
    create: {
      name: 'Comercializadora del Norte S.A. de C.V.',
      rfc: 'CNO180520XYZ',
      registroPatronal: 'Z9876543210',
      regimenFiscal: '601',
      address: 'Blvd. Industrial 1500',
      city: 'Monterrey',
      state: 'NL',
      zipCode: '64000',
      phone: '81 4567 8901',
      email: 'admin@comnorte.mx',
      primaryColor: '#059669',
      secondaryColor: '#34D399',
      pacProvider: 'FINKOK',
      pacMode: 'sandbox',
    },
  });

  // Empresa 4: INSABI (Instituto de Salud para el Bienestar) - Gobierno
  const insabiCompany = await prisma.company.upsert({
    where: { rfc: 'ISB191202GH1' },
    update: {},
    create: {
      name: 'Instituto de Salud para el Bienestar',
      rfc: 'ISB191202GH1',
      institutionType: 'GOVERNMENT',
      govInstitution: 'ISSSTE',
      registroPatronalIssste: 'ISB-ISSSTE-001',
      regimenFiscal: '603',
      address: 'Av. Paseo de la Reforma 156',
      city: 'Ciudad de Mexico',
      state: 'CDMX',
      zipCode: '06600',
      phone: '55 5080 5600',
      email: 'contacto@insabi.gob.mx',
      primaryColor: '#691C32', // Guinda - color institucional gobierno
      secondaryColor: '#BC955C', // Dorado - color secundario gobierno
      pacProvider: 'FINKOK',
      pacMode: 'sandbox',
    },
  });

  console.log('✅ 4 Empresas creadas con diferentes configuraciones');

  // ============================================
  // CREAR USUARIOS POR EMPRESA
  // ============================================

  // Usuarios BFS
  await prisma.user.upsert({
    where: { email: 'rh@bfs.com.mx' },
    update: { companyId: bfsCompany.id },
    create: {
      email: 'rh@bfs.com.mx',
      password: hashedPassword,
      firstName: 'Patricia',
      lastName: 'González',
      roleId: rhRole.id,
      companyId: bfsCompany.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'gerente@bfs.com.mx' },
    update: { companyId: bfsCompany.id },
    create: {
      email: 'gerente@bfs.com.mx',
      password: hashedPassword,
      firstName: 'Ricardo',
      lastName: 'Mendoza',
      roleId: managerRole.id,
      companyId: bfsCompany.id,
    },
  });

  // Usuarios Tech Solutions
  await prisma.user.upsert({
    where: { email: 'rh@techsolutions.mx' },
    update: { companyId: techCompany.id },
    create: {
      email: 'rh@techsolutions.mx',
      password: hashedPassword,
      firstName: 'Andrea',
      lastName: 'Ramírez',
      roleId: rhRole.id,
      companyId: techCompany.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'gerente@techsolutions.mx' },
    update: { companyId: techCompany.id },
    create: {
      email: 'gerente@techsolutions.mx',
      password: hashedPassword,
      firstName: 'Fernando',
      lastName: 'Castro',
      roleId: managerRole.id,
      companyId: techCompany.id,
    },
  });

  // Usuarios Comercializadora del Norte
  await prisma.user.upsert({
    where: { email: 'rh@comnorte.mx' },
    update: { companyId: norteCompany.id },
    create: {
      email: 'rh@comnorte.mx',
      password: hashedPassword,
      firstName: 'Monica',
      lastName: 'Villarreal',
      roleId: rhRole.id,
      companyId: norteCompany.id,
    },
  });

  // Usuarios INSABI
  await prisma.user.upsert({
    where: { email: 'rh@insabi.gob.mx' },
    update: { companyId: insabiCompany.id },
    create: {
      email: 'rh@insabi.gob.mx',
      password: hashedPassword,
      firstName: 'Laura',
      lastName: 'Martinez',
      roleId: rhRole.id,
      companyId: insabiCompany.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'director@insabi.gob.mx' },
    update: { companyId: insabiCompany.id },
    create: {
      email: 'director@insabi.gob.mx',
      password: hashedPassword,
      firstName: 'Carlos',
      lastName: 'Hernandez',
      roleId: managerRole.id,
      companyId: insabiCompany.id,
    },
  });

  console.log('✅ Usuarios RH y Gerentes creados para cada empresa');

  // ============================================
  // CREAR DEPARTAMENTOS POR EMPRESA
  // ============================================

  // Departamentos BFS
  const bfsDepts = {
    rh: await prisma.department.create({ data: { name: 'Recursos Humanos', companyId: bfsCompany.id } }),
    ti: await prisma.department.create({ data: { name: 'Tecnología', companyId: bfsCompany.id } }),
    ops: await prisma.department.create({ data: { name: 'Operaciones', companyId: bfsCompany.id } }),
    admin: await prisma.department.create({ data: { name: 'Administración', companyId: bfsCompany.id } }),
  };

  // Departamentos Tech Solutions
  const techDepts = {
    rh: await prisma.department.create({ data: { name: 'People & Culture', companyId: techCompany.id } }),
    dev: await prisma.department.create({ data: { name: 'Desarrollo', companyId: techCompany.id } }),
    qa: await prisma.department.create({ data: { name: 'QA', companyId: techCompany.id } }),
    pm: await prisma.department.create({ data: { name: 'Project Management', companyId: techCompany.id } }),
  };

  // Departamentos Comercializadora del Norte
  const norteDepts = {
    rh: await prisma.department.create({ data: { name: 'Capital Humano', companyId: norteCompany.id } }),
    ventas: await prisma.department.create({ data: { name: 'Ventas', companyId: norteCompany.id } }),
    almacen: await prisma.department.create({ data: { name: 'Almacen', companyId: norteCompany.id } }),
    finanzas: await prisma.department.create({ data: { name: 'Finanzas', companyId: norteCompany.id } }),
  };

  // Departamentos INSABI (Gobierno)
  const insabiDepts = {
    rh: await prisma.department.create({ data: { name: 'Recursos Humanos', companyId: insabiCompany.id } }),
    medico: await prisma.department.create({ data: { name: 'Servicios Medicos', companyId: insabiCompany.id } }),
    admin: await prisma.department.create({ data: { name: 'Direccion Administrativa', companyId: insabiCompany.id } }),
    juridico: await prisma.department.create({ data: { name: 'Asuntos Juridicos', companyId: insabiCompany.id } }),
    sistemas: await prisma.department.create({ data: { name: 'Tecnologias de la Informacion', companyId: insabiCompany.id } }),
  };

  console.log('✅ Departamentos creados para cada empresa');

  // ============================================
  // CREAR PUESTOS Y BANCOS (COMPARTIDOS)
  // ============================================

  const puestos = await Promise.all([
    prisma.jobPosition.upsert({ where: { id: 'puesto-1' }, update: {}, create: { id: 'puesto-1', name: 'Gerente General', minSalary: 50000, maxSalary: 100000, riskLevel: 'CLASE_I' }}),
    prisma.jobPosition.upsert({ where: { id: 'puesto-2' }, update: {}, create: { id: 'puesto-2', name: 'Gerente de RH', minSalary: 35000, maxSalary: 60000, riskLevel: 'CLASE_I' }}),
    prisma.jobPosition.upsert({ where: { id: 'puesto-3' }, update: {}, create: { id: 'puesto-3', name: 'Desarrollador Sr', minSalary: 40000, maxSalary: 70000, riskLevel: 'CLASE_I' }}),
    prisma.jobPosition.upsert({ where: { id: 'puesto-4' }, update: {}, create: { id: 'puesto-4', name: 'Desarrollador Jr', minSalary: 18000, maxSalary: 35000, riskLevel: 'CLASE_I' }}),
    prisma.jobPosition.upsert({ where: { id: 'puesto-5' }, update: {}, create: { id: 'puesto-5', name: 'Contador', minSalary: 20000, maxSalary: 40000, riskLevel: 'CLASE_I' }}),
    prisma.jobPosition.upsert({ where: { id: 'puesto-6' }, update: {}, create: { id: 'puesto-6', name: 'Vendedor', minSalary: 12000, maxSalary: 25000, riskLevel: 'CLASE_I' }}),
    prisma.jobPosition.upsert({ where: { id: 'puesto-7' }, update: {}, create: { id: 'puesto-7', name: 'Almacenista', minSalary: 10000, maxSalary: 18000, riskLevel: 'CLASE_II' }}),
    prisma.jobPosition.upsert({ where: { id: 'puesto-8' }, update: {}, create: { id: 'puesto-8', name: 'Ingeniero de Soporte', minSalary: 25000, maxSalary: 45000, riskLevel: 'CLASE_I' }}),
    // Puestos de gobierno
    prisma.jobPosition.upsert({ where: { id: 'puesto-9' }, update: {}, create: { id: 'puesto-9', name: 'Director General', minSalary: 80000, maxSalary: 150000, riskLevel: 'CLASE_I' }}),
    prisma.jobPosition.upsert({ where: { id: 'puesto-10' }, update: {}, create: { id: 'puesto-10', name: 'Subdirector', minSalary: 50000, maxSalary: 80000, riskLevel: 'CLASE_I' }}),
    prisma.jobPosition.upsert({ where: { id: 'puesto-11' }, update: {}, create: { id: 'puesto-11', name: 'Jefe de Departamento', minSalary: 35000, maxSalary: 55000, riskLevel: 'CLASE_I' }}),
    prisma.jobPosition.upsert({ where: { id: 'puesto-12' }, update: {}, create: { id: 'puesto-12', name: 'Medico General', minSalary: 25000, maxSalary: 45000, riskLevel: 'CLASE_I' }}),
    prisma.jobPosition.upsert({ where: { id: 'puesto-13' }, update: {}, create: { id: 'puesto-13', name: 'Enfermera(o)', minSalary: 15000, maxSalary: 28000, riskLevel: 'CLASE_II' }}),
    prisma.jobPosition.upsert({ where: { id: 'puesto-14' }, update: {}, create: { id: 'puesto-14', name: 'Analista Administrativo', minSalary: 18000, maxSalary: 32000, riskLevel: 'CLASE_I' }}),
  ]);

  const bancos = await Promise.all([
    prisma.bank.upsert({ where: { code: '002' }, update: {}, create: { code: '002', name: 'BANAMEX' }}),
    prisma.bank.upsert({ where: { code: '012' }, update: {}, create: { code: '012', name: 'BBVA MEXICO' }}),
    prisma.bank.upsert({ where: { code: '014' }, update: {}, create: { code: '014', name: 'SANTANDER' }}),
    prisma.bank.upsert({ where: { code: '021' }, update: {}, create: { code: '021', name: 'HSBC' }}),
    prisma.bank.upsert({ where: { code: '072' }, update: {}, create: { code: '072', name: 'BANORTE' }}),
  ]);

  console.log('✅ Puestos y Bancos creados');

  // ============================================
  // CREAR HORARIOS
  // ============================================

  const scheduleOficina = await prisma.workSchedule.upsert({
    where: { id: 'schedule-oficina' },
    update: {},
    create: {
      id: 'schedule-oficina',
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

  const scheduleMixto = await prisma.workSchedule.upsert({
    where: { id: 'schedule-mixto' },
    update: {},
    create: {
      id: 'schedule-mixto',
      name: 'Horario Mixto',
      description: 'Lunes a Viernes 8:00 - 17:00 + Sábado medio día',
      scheduleDetails: {
        create: [
          { dayOfWeek: 0, startTime: '00:00', endTime: '00:00', isWorkDay: false },
          { dayOfWeek: 1, startTime: '08:00', endTime: '17:00', breakStart: '13:00', breakEnd: '14:00', isWorkDay: true },
          { dayOfWeek: 2, startTime: '08:00', endTime: '17:00', breakStart: '13:00', breakEnd: '14:00', isWorkDay: true },
          { dayOfWeek: 3, startTime: '08:00', endTime: '17:00', breakStart: '13:00', breakEnd: '14:00', isWorkDay: true },
          { dayOfWeek: 4, startTime: '08:00', endTime: '17:00', breakStart: '13:00', breakEnd: '14:00', isWorkDay: true },
          { dayOfWeek: 5, startTime: '08:00', endTime: '17:00', breakStart: '13:00', breakEnd: '14:00', isWorkDay: true },
          { dayOfWeek: 6, startTime: '09:00', endTime: '14:00', isWorkDay: true },
        ],
      },
    },
  });

  console.log('✅ Horarios creados');

  // ============================================
  // CREAR EMPLEADOS POR EMPRESA
  // ============================================

  // EMPLEADOS BFS INGENIERÍA (5 empleados)
  const bfsEmployees = [
    { employeeNumber: 'BFS001', firstName: 'David', lastName: 'Sánchez', secondLastName: 'Correa', email: 'david.sc@bfs.com.mx', rfc: 'SACD8201146R9', curp: 'SACD820114HDFNRV06', nss: '90028219179', birthDate: new Date('1982-01-14'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2025-09-05'), baseSalary: 49903, departmentId: bfsDepts.ti.id, jobPositionId: puestos[2].id },
    { employeeNumber: 'BFS002', firstName: 'Patricia', lastName: 'González', secondLastName: 'Ruiz', email: 'patricia.g@bfs.com.mx', rfc: 'GORP850322ABC', curp: 'GORP850322MASNZR01', nss: '90028219180', birthDate: new Date('1985-03-22'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2023-01-15'), baseSalary: 45000, departmentId: bfsDepts.rh.id, jobPositionId: puestos[1].id },
    { employeeNumber: 'BFS003', firstName: 'Ricardo', lastName: 'Mendoza', secondLastName: 'López', email: 'ricardo.m@bfs.com.mx', rfc: 'MELR880510DEF', curp: 'MELR880510HASNZR02', nss: '90028219181', birthDate: new Date('1988-05-10'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2022-06-01'), baseSalary: 52000, departmentId: bfsDepts.ops.id, jobPositionId: puestos[7].id },
    { employeeNumber: 'BFS004', firstName: 'Carmen', lastName: 'Torres', secondLastName: 'Vega', email: 'carmen.t@bfs.com.mx', rfc: 'TOVC900815GHI', curp: 'TOVC900815MASNZR03', nss: '90028219182', birthDate: new Date('1990-08-15'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2024-02-20'), baseSalary: 28000, departmentId: bfsDepts.ti.id, jobPositionId: puestos[3].id },
    { employeeNumber: 'BFS005', firstName: 'Miguel', lastName: 'Herrera', secondLastName: 'Soto', email: 'miguel.h@bfs.com.mx', rfc: 'HESM920420JKL', curp: 'HESM920420HASNZR04', nss: '90028219183', birthDate: new Date('1992-04-20'), gender: 'MALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2024-08-01'), baseSalary: 25000, departmentId: bfsDepts.admin.id, jobPositionId: puestos[4].id },
  ];

  // EMPLEADOS TECH SOLUTIONS (5 empleados)
  const techEmployees = [
    { employeeNumber: 'TECH001', firstName: 'Andrea', lastName: 'Ramírez', secondLastName: 'Castro', email: 'andrea.r@techsolutions.mx', rfc: 'RACA870612MNO', curp: 'RACA870612MDFRMS01', nss: '80028219184', birthDate: new Date('1987-06-12'), gender: 'FEMALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2021-03-01'), baseSalary: 48000, departmentId: techDepts.rh.id, jobPositionId: puestos[1].id },
    { employeeNumber: 'TECH002', firstName: 'Fernando', lastName: 'Castro', secondLastName: 'Reyes', email: 'fernando.c@techsolutions.mx', rfc: 'CARF850928PQR', curp: 'CARF850928HDFRSY02', nss: '80028219185', birthDate: new Date('1985-09-28'), gender: 'MALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2020-08-15'), baseSalary: 65000, departmentId: techDepts.dev.id, jobPositionId: puestos[2].id },
    { employeeNumber: 'TECH003', firstName: 'Gabriela', lastName: 'Morales', secondLastName: 'Díaz', email: 'gabriela.m@techsolutions.mx', rfc: 'MODG910305STU', curp: 'MODG910305MDFRLS03', nss: '80028219186', birthDate: new Date('1991-03-05'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2022-01-10'), baseSalary: 42000, departmentId: techDepts.qa.id, jobPositionId: puestos[7].id },
    { employeeNumber: 'TECH004', firstName: 'Alejandro', lastName: 'Núñez', secondLastName: 'Ibarra', email: 'alejandro.n@techsolutions.mx', rfc: 'NUIA930720VWX', curp: 'NUIA930720HDFXRB04', nss: '80028219187', birthDate: new Date('1993-07-20'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2023-05-01'), baseSalary: 35000, departmentId: techDepts.dev.id, jobPositionId: puestos[3].id },
    { employeeNumber: 'TECH005', firstName: 'Sofía', lastName: 'Vargas', secondLastName: 'Luna', email: 'sofia.v@techsolutions.mx', rfc: 'VALS950215YZA', curp: 'VALS950215MDFRGS05', nss: '80028219188', birthDate: new Date('1995-02-15'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2024-01-15'), baseSalary: 22000, departmentId: techDepts.pm.id, jobPositionId: puestos[3].id },
  ];

  // EMPLEADOS COMERCIALIZADORA DEL NORTE (5 empleados)
  const norteEmployees = [
    { employeeNumber: 'NTE001', firstName: 'Monica', lastName: 'Villarreal', secondLastName: 'Garza', email: 'monica.v@comnorte.mx', rfc: 'VIGM860418BCD', curp: 'VIGM860418MNLRLR01', nss: '70028219189', birthDate: new Date('1986-04-18'), gender: 'FEMALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2019-02-01'), baseSalary: 42000, departmentId: norteDepts.rh.id, jobPositionId: puestos[1].id },
    { employeeNumber: 'NTE002', firstName: 'Jorge', lastName: 'Trevino', secondLastName: 'Salinas', email: 'jorge.t@comnorte.mx', rfc: 'TESJ840725EFG', curp: 'TESJ840725HNLRVR02', nss: '70028219190', birthDate: new Date('1984-07-25'), gender: 'MALE' as const, maritalStatus: 'DIVORCED' as const, hireDate: new Date('2018-06-15'), baseSalary: 55000, departmentId: norteDepts.ventas.id, jobPositionId: puestos[0].id },
    { employeeNumber: 'NTE003', firstName: 'Lucia', lastName: 'Cantu', secondLastName: 'Lozano', email: 'lucia.c@comnorte.mx', rfc: 'CALL890112HIJ', curp: 'CALL890112MNLNZC03', nss: '70028219191', birthDate: new Date('1989-01-12'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2021-09-01'), baseSalary: 18000, departmentId: norteDepts.ventas.id, jobPositionId: puestos[5].id },
    { employeeNumber: 'NTE004', firstName: 'Roberto', lastName: 'Guajardo', secondLastName: 'Hinojosa', email: 'roberto.g@comnorte.mx', rfc: 'GUHR910830KLM', curp: 'GUHR910830HNLJRB04', nss: '70028219192', birthDate: new Date('1991-08-30'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2022-04-01'), baseSalary: 14000, departmentId: norteDepts.almacen.id, jobPositionId: puestos[6].id },
    { employeeNumber: 'NTE005', firstName: 'Diana', lastName: 'Elizondo', secondLastName: 'Cavazos', email: 'diana.e@comnorte.mx', rfc: 'EICD930605NOP', curp: 'EICD930605MNLLZN05', nss: '70028219193', birthDate: new Date('1993-06-05'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2023-11-01'), baseSalary: 28000, departmentId: norteDepts.finanzas.id, jobPositionId: puestos[4].id },
  ];

  // EMPLEADOS INSABI - Instituto de Salud (5 empleados de gobierno)
  // Prestaciones tipicas de gobierno: Aguinaldo 40 dias, Prima Vacacional 50%, Estimulos, Seguro de Vida
  const insabiEmployees = [
    { employeeNumber: 'ISB001', firstName: 'Carlos', lastName: 'Hernandez', secondLastName: 'Rojas', email: 'carlos.h@insabi.gob.mx', rfc: 'HERC750210QRS', curp: 'HERC750210HDFRNR01', nss: '60028219194', birthDate: new Date('1975-02-10'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2010-03-15'), baseSalary: 85000, departmentId: insabiDepts.admin.id, jobPositionId: puestos[8].id },
    { employeeNumber: 'ISB002', firstName: 'Laura', lastName: 'Martinez', secondLastName: 'Solis', email: 'laura.m@insabi.gob.mx', rfc: 'MASL800515TUV', curp: 'MASL800515MDFRTL02', nss: '60028219195', birthDate: new Date('1980-05-15'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2015-08-01'), baseSalary: 45000, departmentId: insabiDepts.rh.id, jobPositionId: puestos[10].id },
    { employeeNumber: 'ISB003', firstName: 'Ricardo', lastName: 'Perez', secondLastName: 'Vega', email: 'ricardo.p@insabi.gob.mx', rfc: 'PEVR780820WXY', curp: 'PEVR780820HDFRGC03', nss: '60028219196', birthDate: new Date('1978-08-20'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2012-01-16'), baseSalary: 38000, departmentId: insabiDepts.medico.id, jobPositionId: puestos[11].id },
    { employeeNumber: 'ISB004', firstName: 'Ana', lastName: 'Lopez', secondLastName: 'Cruz', email: 'ana.l@insabi.gob.mx', rfc: 'LOCA850930ZAB', curp: 'LOCA850930MDFPRN04', nss: '60028219197', birthDate: new Date('1985-09-30'), gender: 'FEMALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2018-06-01'), baseSalary: 22000, departmentId: insabiDepts.medico.id, jobPositionId: puestos[12].id },
    { employeeNumber: 'ISB005', firstName: 'Jose', lastName: 'Garcia', secondLastName: 'Mendez', email: 'jose.g@insabi.gob.mx', rfc: 'GAMJ900115CDE', curp: 'GAMJ900115HDFRRN05', nss: '60028219198', birthDate: new Date('1990-01-15'), gender: 'MALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2020-02-01'), baseSalary: 25000, departmentId: insabiDepts.sistemas.id, jobPositionId: puestos[13].id },
  ];

  // Insertar empleados
  for (const emp of bfsEmployees) {
    await prisma.employee.upsert({
      where: { employeeNumber: emp.employeeNumber },
      update: {},
      create: {
        ...emp,
        companyId: bfsCompany.id,
        workScheduleId: scheduleOficina.id,
        contractType: 'INDEFINITE',
        employmentType: 'FULL_TIME',
        salaryType: 'MONTHLY',
        paymentMethod: 'TRANSFER',
        bankId: bancos[Math.floor(Math.random() * bancos.length)].id,
        bankAccount: Math.random().toString().slice(2, 12),
        clabe: Math.random().toString().slice(2, 20),
        tipoSalarioImss: 'MIXTO',
        address: 'Dirección de prueba',
        city: 'Aguascalientes',
        state: 'AGS',
        zipCode: '20000',
      },
    });
  }

  for (const emp of techEmployees) {
    await prisma.employee.upsert({
      where: { employeeNumber: emp.employeeNumber },
      update: {},
      create: {
        ...emp,
        companyId: techCompany.id,
        workScheduleId: scheduleOficina.id,
        contractType: 'INDEFINITE',
        employmentType: 'FULL_TIME',
        salaryType: 'MONTHLY',
        paymentMethod: 'TRANSFER',
        bankId: bancos[Math.floor(Math.random() * bancos.length)].id,
        bankAccount: Math.random().toString().slice(2, 12),
        clabe: Math.random().toString().slice(2, 20),
        tipoSalarioImss: 'FIJO',
        address: 'Dirección de prueba',
        city: 'Ciudad de México',
        state: 'CDMX',
        zipCode: '06600',
      },
    });
  }

  for (const emp of norteEmployees) {
    await prisma.employee.upsert({
      where: { employeeNumber: emp.employeeNumber },
      update: {},
      create: {
        ...emp,
        companyId: norteCompany.id,
        workScheduleId: scheduleMixto.id,
        contractType: 'INDEFINITE',
        employmentType: 'FULL_TIME',
        salaryType: 'MONTHLY',
        paymentMethod: 'TRANSFER',
        bankId: bancos[Math.floor(Math.random() * bancos.length)].id,
        bankAccount: Math.random().toString().slice(2, 12),
        clabe: Math.random().toString().slice(2, 20),
        tipoSalarioImss: 'FIJO',
        address: 'Dirección de prueba',
        city: 'Monterrey',
        state: 'NL',
        zipCode: '64000',
      },
    });
  }

  // Insertar empleados INSABI (gobierno con ISSSTE)
  for (const emp of insabiEmployees) {
    await prisma.employee.upsert({
      where: { employeeNumber: emp.employeeNumber },
      update: {},
      create: {
        ...emp,
        companyId: insabiCompany.id,
        workScheduleId: scheduleOficina.id,
        contractType: 'INDEFINITE',
        employmentType: 'FULL_TIME',
        salaryType: 'MONTHLY',
        paymentMethod: 'TRANSFER',
        bankId: bancos[Math.floor(Math.random() * bancos.length)].id,
        bankAccount: Math.random().toString().slice(2, 12),
        clabe: Math.random().toString().slice(2, 20),
        tipoSalarioImss: 'FIJO',
        address: 'Av. Paseo de la Reforma 156',
        city: 'Ciudad de Mexico',
        state: 'CDMX',
        zipCode: '06600',
      },
    });
  }

  console.log('✅ 20 Empleados creados (5 por empresa)');

  // ============================================
  // CREAR USUARIOS EMPLEADOS
  // ============================================

  const allEmployeeEmails = [
    ...bfsEmployees.map(e => ({ email: e.email, firstName: e.firstName, lastName: e.lastName, companyId: bfsCompany.id })),
    ...techEmployees.map(e => ({ email: e.email, firstName: e.firstName, lastName: e.lastName, companyId: techCompany.id })),
    ...norteEmployees.map(e => ({ email: e.email, firstName: e.firstName, lastName: e.lastName, companyId: norteCompany.id })),
    ...insabiEmployees.map(e => ({ email: e.email, firstName: e.firstName, lastName: e.lastName, companyId: insabiCompany.id })),
  ];

  for (const empUser of allEmployeeEmails) {
    await prisma.user.upsert({
      where: { email: empUser.email },
      update: { companyId: empUser.companyId },
      create: {
        email: empUser.email,
        password: hashedPassword,
        firstName: empUser.firstName,
        lastName: empUser.lastName,
        roleId: employeeRole.id,
        companyId: empUser.companyId,
      },
    });
  }

  console.log('✅ Usuarios empleados creados (20 usuarios)');

  // ============================================
  // CREAR CONCEPTOS DE NÓMINA
  // ============================================

  await Promise.all([
    prisma.payrollConcept.upsert({ where: { code: 'P001' }, update: {}, create: { code: 'P001', name: 'Sueldo', type: 'PERCEPTION', satCode: '001', isTaxable: true, isFixed: true }}),
    prisma.payrollConcept.upsert({ where: { code: 'P002' }, update: {}, create: { code: 'P002', name: 'Horas Extra', type: 'PERCEPTION', satCode: '019', isTaxable: true }}),
    prisma.payrollConcept.upsert({ where: { code: 'P003' }, update: {}, create: { code: 'P003', name: 'Prima Vacacional', type: 'PERCEPTION', satCode: '021', isTaxable: true }}),
    prisma.payrollConcept.upsert({ where: { code: 'P004' }, update: {}, create: { code: 'P004', name: 'Aguinaldo', type: 'PERCEPTION', satCode: '002', isTaxable: true }}),
    prisma.payrollConcept.upsert({ where: { code: 'P005' }, update: {}, create: { code: 'P005', name: 'Fondo Ahorro Empresa', type: 'PERCEPTION', satCode: '005', isTaxable: false }}),
    prisma.payrollConcept.upsert({ where: { code: 'P006' }, update: {}, create: { code: 'P006', name: 'Vales de Despensa', type: 'PERCEPTION', satCode: '029', isTaxable: false }}),
    prisma.payrollConcept.upsert({ where: { code: 'D001' }, update: {}, create: { code: 'D001', name: 'ISR', type: 'DEDUCTION', satCode: '002' }}),
    prisma.payrollConcept.upsert({ where: { code: 'D002' }, update: {}, create: { code: 'D002', name: 'IMSS Trabajador', type: 'DEDUCTION', satCode: '001' }}),
    prisma.payrollConcept.upsert({ where: { code: 'D003' }, update: {}, create: { code: 'D003', name: 'Fondo Ahorro Empleado', type: 'DEDUCTION', satCode: '004' }}),
    prisma.payrollConcept.upsert({ where: { code: 'D004' }, update: {}, create: { code: 'D004', name: 'INFONAVIT', type: 'DEDUCTION', satCode: '010' }}),
  ]);

  console.log('✅ Conceptos de nómina creados');

  // ============================================
  // CREAR TIPOS DE INCIDENCIAS
  // ============================================

  await Promise.all([
    prisma.incidentType.upsert({ where: { code: 'FALTA' }, update: {}, create: { code: 'FALTA', name: 'Falta injustificada', category: 'ABSENCE', affectsPayroll: true, isDeduction: true, valueType: 'DAYS', defaultValue: 1 }}),
    prisma.incidentType.upsert({ where: { code: 'FALTA_JUST' }, update: {}, create: { code: 'FALTA_JUST', name: 'Falta justificada', category: 'JUSTIFIED_ABSENCE', affectsPayroll: false, valueType: 'DAYS', defaultValue: 1 }}),
    prisma.incidentType.upsert({ where: { code: 'RETARDO' }, update: {}, create: { code: 'RETARDO', name: 'Retardo', category: 'TARDINESS', affectsPayroll: true, isDeduction: true, valueType: 'HOURS', defaultValue: 1 }}),
    prisma.incidentType.upsert({ where: { code: 'HORAS_EXTRA' }, update: {}, create: { code: 'HORAS_EXTRA', name: 'Horas extra', category: 'OVERTIME', affectsPayroll: true, isDeduction: false, valueType: 'HOURS', defaultValue: 1 }}),
    prisma.incidentType.upsert({ where: { code: 'BONO' }, update: {}, create: { code: 'BONO', name: 'Bono', category: 'BONUS', affectsPayroll: true, isDeduction: false, valueType: 'AMOUNT', defaultValue: 500 }}),
    prisma.incidentType.upsert({ where: { code: 'INCAP_ENF' }, update: {}, create: { code: 'INCAP_ENF', name: 'Incapacidad por enfermedad', category: 'DISABILITY', affectsPayroll: true, valueType: 'DAYS', defaultValue: 1 }}),
  ]);

  console.log('✅ Tipos de incidencias creados');

  // ============================================
  // CREAR PRESTACIONES (BENEFITS)
  // ============================================

  // Prestaciones generales (Ley Federal del Trabajo - LFT)
  await Promise.all([
    // Aguinaldo - 15 días mínimo por ley
    prisma.payrollConcept.upsert({
      where: { code: 'PREST001' },
      update: {},
      create: { code: 'PREST001', name: 'Aguinaldo', type: 'PERCEPTION', satCode: '002', isTaxable: true, isFixed: false, description: 'Aguinaldo anual - 15 días mínimo LFT' },
    }),
    // Prima Vacacional - 25% mínimo por ley
    prisma.payrollConcept.upsert({
      where: { code: 'PREST002' },
      update: {},
      create: { code: 'PREST002', name: 'Prima Vacacional', type: 'PERCEPTION', satCode: '021', isTaxable: true, isFixed: false, description: 'Prima vacacional - 25% mínimo LFT' },
    }),
    // Vales de Despensa
    prisma.payrollConcept.upsert({
      where: { code: 'PREST003' },
      update: {},
      create: { code: 'PREST003', name: 'Vales de Despensa', type: 'PERCEPTION', satCode: '029', isTaxable: false, isFixed: true, description: 'Vales de despensa mensuales' },
    }),
    // Fondo de Ahorro (Aportación empresa)
    prisma.payrollConcept.upsert({
      where: { code: 'PREST004' },
      update: {},
      create: { code: 'PREST004', name: 'Fondo de Ahorro Patronal', type: 'PERCEPTION', satCode: '005', isTaxable: false, isFixed: true, description: 'Aportación patronal al fondo de ahorro' },
    }),
    // Seguro de Vida
    prisma.payrollConcept.upsert({
      where: { code: 'PREST005' },
      update: {},
      create: { code: 'PREST005', name: 'Seguro de Vida', type: 'PERCEPTION', satCode: '038', isTaxable: false, isFixed: true, description: 'Prima de seguro de vida pagada por empresa' },
    }),
    // Seguro de Gastos Médicos Mayores
    prisma.payrollConcept.upsert({
      where: { code: 'PREST006' },
      update: {},
      create: { code: 'PREST006', name: 'Seguro Gastos Médicos', type: 'PERCEPTION', satCode: '038', isTaxable: false, isFixed: true, description: 'Seguro de gastos médicos mayores' },
    }),
    // PTU - Reparto de Utilidades
    prisma.payrollConcept.upsert({
      where: { code: 'PREST007' },
      update: {},
      create: { code: 'PREST007', name: 'PTU', type: 'PERCEPTION', satCode: '003', isTaxable: true, isFixed: false, description: 'Participación de los Trabajadores en las Utilidades' },
    }),
  ]);

  // Prestaciones específicas de gobierno (ISSSTE)
  await Promise.all([
    // Aguinaldo gobierno - 40 días
    prisma.payrollConcept.upsert({
      where: { code: 'GOB001' },
      update: {},
      create: { code: 'GOB001', name: 'Aguinaldo Gobierno', type: 'PERCEPTION', satCode: '002', isTaxable: true, isFixed: false, description: 'Aguinaldo gobierno - 40 días' },
    }),
    // Prima Vacacional gobierno - 50%
    prisma.payrollConcept.upsert({
      where: { code: 'GOB002' },
      update: {},
      create: { code: 'GOB002', name: 'Prima Vacacional Gobierno', type: 'PERCEPTION', satCode: '021', isTaxable: true, isFixed: false, description: 'Prima vacacional gobierno - 50%' },
    }),
    // Estímulos al desempeño
    prisma.payrollConcept.upsert({
      where: { code: 'GOB003' },
      update: {},
      create: { code: 'GOB003', name: 'Estímulos al Desempeño', type: 'PERCEPTION', satCode: '038', isTaxable: true, isFixed: false, description: 'Estímulos por productividad y desempeño' },
    }),
    // Ayuda para lentes
    prisma.payrollConcept.upsert({
      where: { code: 'GOB004' },
      update: {},
      create: { code: 'GOB004', name: 'Ayuda para Lentes', type: 'PERCEPTION', satCode: '038', isTaxable: false, isFixed: false, description: 'Apoyo para adquisición de lentes' },
    }),
    // Canasta Navideña
    prisma.payrollConcept.upsert({
      where: { code: 'GOB005' },
      update: {},
      create: { code: 'GOB005', name: 'Canasta Navideña', type: 'PERCEPTION', satCode: '038', isTaxable: false, isFixed: false, description: 'Canasta navideña de fin de año' },
    }),
    // Ayuda de transporte
    prisma.payrollConcept.upsert({
      where: { code: 'GOB006' },
      update: {},
      create: { code: 'GOB006', name: 'Ayuda de Transporte', type: 'PERCEPTION', satCode: '038', isTaxable: false, isFixed: true, description: 'Apoyo mensual para transporte' },
    }),
  ]);

  // Deducciones específicas de gobierno (ISSSTE)
  await Promise.all([
    prisma.payrollConcept.upsert({
      where: { code: 'DED_ISSSTE' },
      update: {},
      create: { code: 'DED_ISSSTE', name: 'ISSSTE Trabajador', type: 'DEDUCTION', satCode: '001', description: 'Cuota ISSSTE trabajador' },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'DED_FOVISSSTE' },
      update: {},
      create: { code: 'DED_FOVISSSTE', name: 'FOVISSSTE', type: 'DEDUCTION', satCode: '010', description: 'Fondo de Vivienda ISSSTE' },
    }),
    prisma.payrollConcept.upsert({
      where: { code: 'DED_SAR' },
      update: {},
      create: { code: 'DED_SAR', name: 'SAR', type: 'DEDUCTION', satCode: '017', description: 'Sistema de Ahorro para el Retiro' },
    }),
  ]);

  console.log('✅ Prestaciones y deducciones creadas (LFT y Gobierno)');

  // ============================================
  // CREAR SALDOS DE VACACIONES (LFT Art. 76-81)
  // ============================================
  // Según LFT: Sin vacaciones hasta cumplir 1 año
  // Año 1: 12 días | Año 2: 14 días | Año 3: 16 días | Año 4: 18 días
  // Año 5+: 20 días | +2 días por cada 5 años adicionales

  const currentYear = new Date().getFullYear();
  const today = new Date();
  const allEmployees = await prisma.employee.findMany();

  for (const emp of allEmployees) {
    const hireDate = new Date(emp.hireDate);
    const anniversaryThisYear = new Date(hireDate.getFullYear() + (currentYear - hireDate.getFullYear()), hireDate.getMonth(), hireDate.getDate());

    // Calcular años completos trabajados
    let yearsCompleted = currentYear - hireDate.getFullYear();
    if (today < anniversaryThisYear) {
      yearsCompleted--; // No ha cumplido el aniversario este año
    }
    yearsCompleted = Math.max(0, yearsCompleted);

    // Calcular días según LFT Art. 76
    let earnedDays = 0;
    if (yearsCompleted >= 1) {
      if (yearsCompleted === 1) earnedDays = 12;
      else if (yearsCompleted === 2) earnedDays = 14;
      else if (yearsCompleted === 3) earnedDays = 16;
      else if (yearsCompleted === 4) earnedDays = 18;
      else if (yearsCompleted >= 5 && yearsCompleted < 10) earnedDays = 20;
      else if (yearsCompleted >= 10 && yearsCompleted < 15) earnedDays = 22;
      else if (yearsCompleted >= 15 && yearsCompleted < 20) earnedDays = 24;
      else earnedDays = 26; // 20+ años
    }

    await prisma.vacationBalance.upsert({
      where: { employeeId_year: { employeeId: emp.id, year: currentYear }},
      update: {},
      create: { employeeId: emp.id, year: currentYear, earnedDays, usedDays: 0, pendingDays: 0, expiredDays: 0 },
    });
  }

  console.log('✅ Saldos de vacaciones creados (según LFT Art. 76)');

  // ============================================
  // RESUMEN FINAL
  // ============================================

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n' + '='.repeat(60));
  console.log('📧 CREDENCIALES DE ACCESO');
  console.log('='.repeat(60));
  console.log('\n👑 SUPER ADMINISTRADOR (acceso a todas las empresas):');
  console.log('   Email: admin@sistema.com');
  console.log('   Password: admin123');
  console.log('\n🏢 BFS INGENIERÍA APLICADA (Color: Azul):');
  console.log('   RH: rh@bfs.com.mx / admin123');
  console.log('   Gerente: gerente@bfs.com.mx / admin123');
  console.log('   Empleados: david.sc@bfs.com.mx, patricia.g@bfs.com.mx, etc.');
  console.log('\n🏢 TECH SOLUTIONS MÉXICO (Color: Morado):');
  console.log('   RH: rh@techsolutions.mx / admin123');
  console.log('   Gerente: gerente@techsolutions.mx / admin123');
  console.log('   Empleados: andrea.r@techsolutions.mx, fernando.c@techsolutions.mx, etc.');
  console.log('\n🏢 COMERCIALIZADORA DEL NORTE (Color: Verde):');
  console.log('   RH: rh@comnorte.mx / admin123');
  console.log('   Empleados: monica.v@comnorte.mx, jorge.t@comnorte.mx, etc.');
  console.log('\n🏛️ INSABI - GOBIERNO (Color: Guinda/Dorado, ISSSTE):');
  console.log('   RH: rh@insabi.gob.mx / admin123');
  console.log('   Director: director@insabi.gob.mx / admin123');
  console.log('   Empleados: carlos.h@insabi.gob.mx, laura.m@insabi.gob.mx, etc.');
  console.log('   🔸 Prestaciones gobierno: Aguinaldo 40 días, Prima Vac 50%');
  console.log('   🔸 Deducciones: ISSSTE, FOVISSSTE, SAR');
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN:');
  console.log('   - 4 Empresas con diferentes colores/configuraciones');
  console.log('   - 20 Empleados (5 por empresa)');
  console.log('   - 1 Super Admin + 7 usuarios RH/Gerente + 20 usuarios empleado');
  console.log('   - Cada empresa tiene su propia configuración de colores');
  console.log('   - Prestaciones LFT: Aguinaldo, Prima Vacacional, Vales, etc.');
  console.log('   - Prestaciones Gobierno: ISSSTE, FOVISSSTE, SAR, Estímulos');
  console.log('   - Vacaciones según LFT Art. 76 (0 días primer año, 12 días al cumplir 1 año)');
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
