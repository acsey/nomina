import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // ============================================
  // CREAR 7 ROLES CON PERMISOS GRANULARES
  // ============================================
  // RBAC: Role-Based Access Control
  // - SYSTEM_ADMIN: Administrador del sistema, acceso total
  // - COMPANY_ADMIN: Administrador de empresa, aprueba nóminas/incidencias de SU empresa
  // - HR_ADMIN: Administrador de RH, gestión de empleados y RH
  // - PAYROLL_ADMIN: Administrador de nómina, procesamiento de nómina
  // - MANAGER: Gerente, gestión de equipo y aprobación de vacaciones
  // - EMPLOYEE: Empleado, acceso a información propia
  // - AUDITOR: Auditor, acceso de solo lectura para auditoría

  const systemAdminRole = await prisma.role.upsert({
    where: { name: 'SYSTEM_ADMIN' },
    update: {
      description: 'Administrador del Sistema - Acceso total al sistema',
      permissions: JSON.stringify([
        '*',
        'system:config',
        'system:maintenance',
        'companies:*',
        'users:*',
        'employees:*',
        'payroll:*',
        'incidents:*',
        'vacations:*',
        'benefits:*',
        'reports:*',
        'settings:*',
        'audit:*',
      ]),
    },
    create: {
      name: 'SYSTEM_ADMIN',
      description: 'Administrador del Sistema - Acceso total al sistema',
      permissions: JSON.stringify([
        '*',
        'system:config',
        'system:maintenance',
        'companies:*',
        'users:*',
        'employees:*',
        'payroll:*',
        'incidents:*',
        'vacations:*',
        'benefits:*',
        'reports:*',
        'settings:*',
        'audit:*',
      ]),
    },
  });

  const companyAdminRole = await prisma.role.upsert({
    where: { name: 'COMPANY_ADMIN' },
    update: {
      description: 'Administrador de Empresa - Gestión completa de la empresa',
      permissions: JSON.stringify([
        'users:read:company', 'users:write:company', 'users:create:company',
        'employees:*:company',
        'payroll:*:company', 'payroll:approve',
        'incidents:*:company', 'incidents:approve',
        'vacations:*:company', 'vacations:approve',
        'benefits:*:company', 'benefits:approve',
        'reports:*:company',
        'settings:read:company', 'settings:write:company',
        'audit:read:company',
      ]),
    },
    create: {
      name: 'COMPANY_ADMIN',
      description: 'Administrador de Empresa - Gestión completa de la empresa',
      permissions: JSON.stringify([
        'users:read:company', 'users:write:company', 'users:create:company',
        'employees:*:company',
        'payroll:*:company', 'payroll:approve',
        'incidents:*:company', 'incidents:approve',
        'vacations:*:company', 'vacations:approve',
        'benefits:*:company', 'benefits:approve',
        'reports:*:company',
        'settings:read:company', 'settings:write:company',
        'audit:read:company',
      ]),
    },
  });

  const hrAdminRole = await prisma.role.upsert({
    where: { name: 'HR_ADMIN' },
    update: {
      description: 'Administrador de RH - Gestión de empleados y RH',
      permissions: JSON.stringify([
        'employees:read:company', 'employees:write:company', 'employees:create:company', 'employees:deactivate:company',
        'incidents:*:company',
        'vacations:*:company', 'vacations:approve:company',
        'benefits:read:company', 'benefits:write:company', 'benefits:assign:company',
        'reports:read:company', 'reports:export:company',
        'profile:read:own', 'profile:write:own',
        'attendance:*:company',
      ]),
    },
    create: {
      name: 'HR_ADMIN',
      description: 'Administrador de RH - Gestión de empleados y RH',
      permissions: JSON.stringify([
        'employees:read:company', 'employees:write:company', 'employees:create:company', 'employees:deactivate:company',
        'incidents:*:company',
        'vacations:*:company', 'vacations:approve:company',
        'benefits:read:company', 'benefits:write:company', 'benefits:assign:company',
        'reports:read:company', 'reports:export:company',
        'profile:read:own', 'profile:write:own',
        'attendance:*:company',
      ]),
    },
  });

  const payrollAdminRole = await prisma.role.upsert({
    where: { name: 'PAYROLL_ADMIN' },
    update: {
      description: 'Administrador de Nómina - Procesamiento de nómina',
      permissions: JSON.stringify([
        'employees:read:company',
        'payroll:read:company', 'payroll:write:company', 'payroll:calculate:company',
        'payroll:preview:company', 'payroll:stamp:company', 'payroll:cancel:company',
        'incidents:read:company',
        'vacations:read:company',
        'benefits:read:company',
        'reports:read:company', 'reports:export:company',
        'profile:read:own', 'profile:write:own',
      ]),
    },
    create: {
      name: 'PAYROLL_ADMIN',
      description: 'Administrador de Nómina - Procesamiento de nómina',
      permissions: JSON.stringify([
        'employees:read:company',
        'payroll:read:company', 'payroll:write:company', 'payroll:calculate:company',
        'payroll:preview:company', 'payroll:stamp:company', 'payroll:cancel:company',
        'incidents:read:company',
        'vacations:read:company',
        'benefits:read:company',
        'reports:read:company', 'reports:export:company',
        'profile:read:own', 'profile:write:own',
      ]),
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {
      description: 'Gerente - Gestión de equipo',
      permissions: JSON.stringify([
        'employees:read:subordinates',
        'incidents:read:subordinates', 'incidents:create:subordinates',
        'vacations:read:subordinates', 'vacations:approve:subordinates',
        'payroll:read:subordinates',
        'reports:read:subordinates',
        'attendance:read:subordinates', 'attendance:approve:subordinates',
        'profile:read:own', 'profile:write:own',
        'payroll:read:own',
        'vacations:create:own', 'vacations:read:own',
        'incidents:read:own',
        'benefits:read:own',
        'attendance:read:own', 'attendance:clock:own',
      ]),
    },
    create: {
      name: 'MANAGER',
      description: 'Gerente - Gestión de equipo',
      permissions: JSON.stringify([
        'employees:read:subordinates',
        'incidents:read:subordinates', 'incidents:create:subordinates',
        'vacations:read:subordinates', 'vacations:approve:subordinates',
        'payroll:read:subordinates',
        'reports:read:subordinates',
        'attendance:read:subordinates', 'attendance:approve:subordinates',
        'profile:read:own', 'profile:write:own',
        'payroll:read:own',
        'vacations:create:own', 'vacations:read:own',
        'incidents:read:own',
        'benefits:read:own',
        'attendance:read:own', 'attendance:clock:own',
      ]),
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'EMPLOYEE' },
    update: {
      description: 'Empleado - Acceso a información propia',
      permissions: JSON.stringify([
        'profile:read:own', 'profile:write:own',
        'payroll:read:own',
        'vacations:create:own', 'vacations:read:own', 'vacations:cancel:own',
        'incidents:read:own',
        'benefits:read:own',
        'attendance:read:own', 'attendance:clock:own',
        'documents:read:own', 'documents:download:own',
      ]),
    },
    create: {
      name: 'EMPLOYEE',
      description: 'Empleado - Acceso a información propia',
      permissions: JSON.stringify([
        'profile:read:own', 'profile:write:own',
        'payroll:read:own',
        'vacations:create:own', 'vacations:read:own', 'vacations:cancel:own',
        'incidents:read:own',
        'benefits:read:own',
        'attendance:read:own', 'attendance:clock:own',
        'documents:read:own', 'documents:download:own',
      ]),
    },
  });

  const auditorRole = await prisma.role.upsert({
    where: { name: 'AUDITOR' },
    update: {
      description: 'Auditor - Acceso de solo lectura para auditoría',
      permissions: JSON.stringify([
        'employees:read:company',
        'payroll:read:company',
        'incidents:read:company',
        'vacations:read:company',
        'benefits:read:company',
        'reports:read:company', 'reports:export:company',
        'audit:read:company', 'audit:export:company',
        'settings:read:company',
      ]),
    },
    create: {
      name: 'AUDITOR',
      description: 'Auditor - Acceso de solo lectura para auditoría',
      permissions: JSON.stringify([
        'employees:read:company',
        'payroll:read:company',
        'incidents:read:company',
        'vacations:read:company',
        'benefits:read:company',
        'reports:read:company', 'reports:export:company',
        'audit:read:company', 'audit:export:company',
        'settings:read:company',
      ]),
    },
  });

  // Backward compatibility: Also create/update old role names pointing to new roles
  // This ensures existing users with old role names still work
  await prisma.role.upsert({
    where: { name: 'admin' },
    update: { description: 'DEPRECATED: Use SYSTEM_ADMIN instead' },
    create: {
      name: 'admin',
      description: 'DEPRECATED: Use SYSTEM_ADMIN instead',
      permissions: JSON.stringify(['*']),
    },
  });

  await prisma.role.upsert({
    where: { name: 'rh' },
    update: { description: 'DEPRECATED: Use HR_ADMIN instead' },
    create: {
      name: 'rh',
      description: 'DEPRECATED: Use HR_ADMIN instead',
      permissions: JSON.stringify(['employees:read:company']),
    },
  });

  console.log('✅ Roles creados con permisos RBAC granulares:');
  console.log('   - SYSTEM_ADMIN: Administrador del Sistema (acceso total)');
  console.log('   - COMPANY_ADMIN: Administrador de Empresa (gestión completa de empresa)');
  console.log('   - HR_ADMIN: Administrador de RH (gestión de empleados)');
  console.log('   - PAYROLL_ADMIN: Administrador de Nómina (procesamiento de nómina)');
  console.log('   - MANAGER: Gerente (gestión de equipo)');
  console.log('   - EMPLOYEE: Empleado (acceso a información propia)');
  console.log('   - AUDITOR: Auditor (solo lectura para auditoría)');

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
      roleId: systemAdminRole.id,
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
      roleId: hrAdminRole.id,
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
      roleId: hrAdminRole.id,
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
      roleId: hrAdminRole.id,
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
      roleId: hrAdminRole.id,
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

  // ============================================
  // CREAR ADMINISTRADORES POR EMPRESA
  // ============================================

  // Admin BFS
  await prisma.user.upsert({
    where: { email: 'admin@bfs.com.mx' },
    update: { companyId: bfsCompany.id },
    create: {
      email: 'admin@bfs.com.mx',
      password: hashedPassword,
      firstName: 'Roberto',
      lastName: 'García',
      roleId: companyAdminRole.id,
      companyId: bfsCompany.id,
    },
  });

  // Admin Tech Solutions
  await prisma.user.upsert({
    where: { email: 'admin@techsolutions.mx' },
    update: { companyId: techCompany.id },
    create: {
      email: 'admin@techsolutions.mx',
      password: hashedPassword,
      firstName: 'María',
      lastName: 'López',
      roleId: companyAdminRole.id,
      companyId: techCompany.id,
    },
  });

  // Admin Comercializadora del Norte
  await prisma.user.upsert({
    where: { email: 'admin@comnorte.mx' },
    update: { companyId: norteCompany.id },
    create: {
      email: 'admin@comnorte.mx',
      password: hashedPassword,
      firstName: 'Juan',
      lastName: 'Treviño',
      roleId: companyAdminRole.id,
      companyId: norteCompany.id,
    },
  });

  // Admin INSABI
  await prisma.user.upsert({
    where: { email: 'admin@insabi.gob.mx' },
    update: { companyId: insabiCompany.id },
    create: {
      email: 'admin@insabi.gob.mx',
      password: hashedPassword,
      firstName: 'Pedro',
      lastName: 'Ramírez',
      roleId: companyAdminRole.id,
      companyId: insabiCompany.id,
    },
  });

  console.log('✅ Usuarios RH, Gerentes y Admins creados para cada empresa');

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

  // EMPLEADOS BFS INGENIERÍA (7 empleados - incluyendo admin, RH, gerente con emails que coinciden)
  const bfsEmployees = [
    // Admin de empresa - email coincide con usuario admin@bfs.com.mx
    { employeeNumber: 'BFS000', firstName: 'Roberto', lastName: 'García', secondLastName: 'Méndez', email: 'admin@bfs.com.mx', rfc: 'GAMR780215XYZ', curp: 'GAMR780215HASNRB01', nss: '90028219177', birthDate: new Date('1978-02-15'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2018-01-15'), baseSalary: 75000, departmentId: bfsDepts.admin.id, jobPositionId: puestos[0].id },
    // RH - email coincide con usuario rh@bfs.com.mx
    { employeeNumber: 'BFS001', firstName: 'Patricia', lastName: 'González', secondLastName: 'Ruiz', email: 'rh@bfs.com.mx', rfc: 'GORP850322ABC', curp: 'GORP850322MASNZR01', nss: '90028219180', birthDate: new Date('1985-03-22'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2020-01-15'), baseSalary: 45000, departmentId: bfsDepts.rh.id, jobPositionId: puestos[1].id },
    // Gerente - email coincide con usuario gerente@bfs.com.mx
    { employeeNumber: 'BFS002', firstName: 'Ricardo', lastName: 'Mendoza', secondLastName: 'López', email: 'gerente@bfs.com.mx', rfc: 'MELR880510DEF', curp: 'MELR880510HASNZR02', nss: '90028219181', birthDate: new Date('1988-05-10'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2019-06-01'), baseSalary: 52000, departmentId: bfsDepts.ops.id, jobPositionId: puestos[7].id },
    // Empleados regulares
    { employeeNumber: 'BFS003', firstName: 'David', lastName: 'Sánchez', secondLastName: 'Correa', email: 'david.sc@bfs.com.mx', rfc: 'SACD8201146R9', curp: 'SACD820114HDFNRV06', nss: '90028219179', birthDate: new Date('1982-01-14'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2022-09-05'), baseSalary: 49903, departmentId: bfsDepts.ti.id, jobPositionId: puestos[2].id },
    { employeeNumber: 'BFS004', firstName: 'Carmen', lastName: 'Torres', secondLastName: 'Vega', email: 'carmen.t@bfs.com.mx', rfc: 'TOVC900815GHI', curp: 'TOVC900815MASNZR03', nss: '90028219182', birthDate: new Date('1990-08-15'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2023-02-20'), baseSalary: 28000, departmentId: bfsDepts.ti.id, jobPositionId: puestos[3].id },
    { employeeNumber: 'BFS005', firstName: 'Miguel', lastName: 'Herrera', secondLastName: 'Soto', email: 'miguel.h@bfs.com.mx', rfc: 'HESM920420JKL', curp: 'HESM920420HASNZR04', nss: '90028219183', birthDate: new Date('1992-04-20'), gender: 'MALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2024-08-01'), baseSalary: 25000, departmentId: bfsDepts.admin.id, jobPositionId: puestos[4].id },
    { employeeNumber: 'BFS006', firstName: 'Ana', lastName: 'Ruiz', secondLastName: 'Pérez', email: 'ana.r@bfs.com.mx', rfc: 'RUPA950112MNO', curp: 'RUPA950112MASNZR05', nss: '90028219184', birthDate: new Date('1995-01-12'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2024-03-01'), baseSalary: 22000, departmentId: bfsDepts.ops.id, jobPositionId: puestos[3].id },
  ];

  // EMPLEADOS TECH SOLUTIONS (7 empleados - incluyendo admin, RH, gerente con emails que coinciden)
  const techEmployees = [
    // Admin de empresa - email coincide con usuario admin@techsolutions.mx
    { employeeNumber: 'TECH000', firstName: 'María', lastName: 'López', secondLastName: 'Fernández', email: 'admin@techsolutions.mx', rfc: 'LOFM800320ABC', curp: 'LOFM800320MDFPRL01', nss: '80028219183', birthDate: new Date('1980-03-20'), gender: 'FEMALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2017-05-01'), baseSalary: 80000, departmentId: techDepts.rh.id, jobPositionId: puestos[0].id },
    // RH - email coincide con usuario rh@techsolutions.mx
    { employeeNumber: 'TECH001', firstName: 'Andrea', lastName: 'Ramírez', secondLastName: 'Castro', email: 'rh@techsolutions.mx', rfc: 'RACA870612MNO', curp: 'RACA870612MDFRMS01', nss: '80028219184', birthDate: new Date('1987-06-12'), gender: 'FEMALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2019-03-01'), baseSalary: 48000, departmentId: techDepts.rh.id, jobPositionId: puestos[1].id },
    // Gerente - email coincide con usuario gerente@techsolutions.mx
    { employeeNumber: 'TECH002', firstName: 'Fernando', lastName: 'Castro', secondLastName: 'Reyes', email: 'gerente@techsolutions.mx', rfc: 'CARF850928PQR', curp: 'CARF850928HDFRSY02', nss: '80028219185', birthDate: new Date('1985-09-28'), gender: 'MALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2018-08-15'), baseSalary: 65000, departmentId: techDepts.dev.id, jobPositionId: puestos[2].id },
    // Empleados regulares
    { employeeNumber: 'TECH003', firstName: 'Gabriela', lastName: 'Morales', secondLastName: 'Díaz', email: 'gabriela.m@techsolutions.mx', rfc: 'MODG910305STU', curp: 'MODG910305MDFRLS03', nss: '80028219186', birthDate: new Date('1991-03-05'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2022-01-10'), baseSalary: 42000, departmentId: techDepts.qa.id, jobPositionId: puestos[7].id },
    { employeeNumber: 'TECH004', firstName: 'Alejandro', lastName: 'Núñez', secondLastName: 'Ibarra', email: 'alejandro.n@techsolutions.mx', rfc: 'NUIA930720VWX', curp: 'NUIA930720HDFXRB04', nss: '80028219187', birthDate: new Date('1993-07-20'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2023-05-01'), baseSalary: 35000, departmentId: techDepts.dev.id, jobPositionId: puestos[3].id },
    { employeeNumber: 'TECH005', firstName: 'Sofía', lastName: 'Vargas', secondLastName: 'Luna', email: 'sofia.v@techsolutions.mx', rfc: 'VALS950215YZA', curp: 'VALS950215MDFRGS05', nss: '80028219188', birthDate: new Date('1995-02-15'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2024-01-15'), baseSalary: 22000, departmentId: techDepts.pm.id, jobPositionId: puestos[3].id },
    { employeeNumber: 'TECH006', firstName: 'Carlos', lastName: 'Reyes', secondLastName: 'Sánchez', email: 'carlos.r@techsolutions.mx', rfc: 'RESC920610PQR', curp: 'RESC920610HDFRSC06', nss: '80028219189', birthDate: new Date('1992-06-10'), gender: 'MALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2024-02-01'), baseSalary: 28000, departmentId: techDepts.dev.id, jobPositionId: puestos[3].id },
  ];

  // EMPLEADOS COMERCIALIZADORA DEL NORTE (6 empleados - incluyendo admin, RH con emails que coinciden)
  const norteEmployees = [
    // Admin de empresa - email coincide con usuario admin@comnorte.mx
    { employeeNumber: 'NTE000', firstName: 'Juan', lastName: 'Treviño', secondLastName: 'García', email: 'admin@comnorte.mx', rfc: 'TEGJ750315ABC', curp: 'TEGJ750315HNLRVN01', nss: '70028219188', birthDate: new Date('1975-03-15'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2015-01-10'), baseSalary: 70000, departmentId: norteDepts.finanzas.id, jobPositionId: puestos[0].id },
    // RH - email coincide con usuario rh@comnorte.mx
    { employeeNumber: 'NTE001', firstName: 'Monica', lastName: 'Villarreal', secondLastName: 'Garza', email: 'rh@comnorte.mx', rfc: 'VIGM860418BCD', curp: 'VIGM860418MNLRLR01', nss: '70028219189', birthDate: new Date('1986-04-18'), gender: 'FEMALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2017-02-01'), baseSalary: 42000, departmentId: norteDepts.rh.id, jobPositionId: puestos[1].id },
    // Empleados regulares
    { employeeNumber: 'NTE002', firstName: 'Jorge', lastName: 'Trevino', secondLastName: 'Salinas', email: 'jorge.t@comnorte.mx', rfc: 'TESJ840725EFG', curp: 'TESJ840725HNLRVR02', nss: '70028219190', birthDate: new Date('1984-07-25'), gender: 'MALE' as const, maritalStatus: 'DIVORCED' as const, hireDate: new Date('2018-06-15'), baseSalary: 55000, departmentId: norteDepts.ventas.id, jobPositionId: puestos[0].id },
    { employeeNumber: 'NTE003', firstName: 'Lucia', lastName: 'Cantu', secondLastName: 'Lozano', email: 'lucia.c@comnorte.mx', rfc: 'CALL890112HIJ', curp: 'CALL890112MNLNZC03', nss: '70028219191', birthDate: new Date('1989-01-12'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2021-09-01'), baseSalary: 18000, departmentId: norteDepts.ventas.id, jobPositionId: puestos[5].id },
    { employeeNumber: 'NTE004', firstName: 'Roberto', lastName: 'Guajardo', secondLastName: 'Hinojosa', email: 'roberto.g@comnorte.mx', rfc: 'GUHR910830KLM', curp: 'GUHR910830HNLJRB04', nss: '70028219192', birthDate: new Date('1991-08-30'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2022-04-01'), baseSalary: 14000, departmentId: norteDepts.almacen.id, jobPositionId: puestos[6].id },
    { employeeNumber: 'NTE005', firstName: 'Diana', lastName: 'Elizondo', secondLastName: 'Cavazos', email: 'diana.e@comnorte.mx', rfc: 'EICD930605NOP', curp: 'EICD930605MNLLZN05', nss: '70028219193', birthDate: new Date('1993-06-05'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2023-11-01'), baseSalary: 28000, departmentId: norteDepts.finanzas.id, jobPositionId: puestos[4].id },
  ];

  // EMPLEADOS INSABI - Instituto de Salud (7 empleados de gobierno - incluyendo admin, RH, director)
  // Prestaciones tipicas de gobierno: Aguinaldo 40 dias, Prima Vacacional 50%, Estimulos, Seguro de Vida
  const insabiEmployees = [
    // Admin de empresa - email coincide con usuario admin@insabi.gob.mx
    { employeeNumber: 'ISB000', firstName: 'Pedro', lastName: 'Ramírez', secondLastName: 'Torres', email: 'admin@insabi.gob.mx', rfc: 'RATP720510ABC', curp: 'RATP720510HDFMRD01', nss: '60028219193', birthDate: new Date('1972-05-10'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2008-01-15'), baseSalary: 95000, departmentId: insabiDepts.admin.id, jobPositionId: puestos[8].id },
    // RH - email coincide con usuario rh@insabi.gob.mx
    { employeeNumber: 'ISB001', firstName: 'Laura', lastName: 'Martinez', secondLastName: 'Solis', email: 'rh@insabi.gob.mx', rfc: 'MASL800515TUV', curp: 'MASL800515MDFRTL02', nss: '60028219195', birthDate: new Date('1980-05-15'), gender: 'FEMALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2013-08-01'), baseSalary: 45000, departmentId: insabiDepts.rh.id, jobPositionId: puestos[10].id },
    // Director - email coincide con usuario director@insabi.gob.mx
    { employeeNumber: 'ISB002', firstName: 'Carlos', lastName: 'Hernandez', secondLastName: 'Rojas', email: 'director@insabi.gob.mx', rfc: 'HERC750210QRS', curp: 'HERC750210HDFRNR01', nss: '60028219194', birthDate: new Date('1975-02-10'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2010-03-15'), baseSalary: 85000, departmentId: insabiDepts.admin.id, jobPositionId: puestos[9].id },
    // Empleados regulares
    { employeeNumber: 'ISB003', firstName: 'Ricardo', lastName: 'Perez', secondLastName: 'Vega', email: 'ricardo.p@insabi.gob.mx', rfc: 'PEVR780820WXY', curp: 'PEVR780820HDFRGC03', nss: '60028219196', birthDate: new Date('1978-08-20'), gender: 'MALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2012-01-16'), baseSalary: 38000, departmentId: insabiDepts.medico.id, jobPositionId: puestos[11].id },
    { employeeNumber: 'ISB004', firstName: 'Ana', lastName: 'Lopez', secondLastName: 'Cruz', email: 'ana.l@insabi.gob.mx', rfc: 'LOCA850930ZAB', curp: 'LOCA850930MDFPRN04', nss: '60028219197', birthDate: new Date('1985-09-30'), gender: 'FEMALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2018-06-01'), baseSalary: 22000, departmentId: insabiDepts.medico.id, jobPositionId: puestos[12].id },
    { employeeNumber: 'ISB005', firstName: 'Jose', lastName: 'Garcia', secondLastName: 'Mendez', email: 'jose.g@insabi.gob.mx', rfc: 'GAMJ900115CDE', curp: 'GAMJ900115HDFRRN05', nss: '60028219198', birthDate: new Date('1990-01-15'), gender: 'MALE' as const, maritalStatus: 'SINGLE' as const, hireDate: new Date('2020-02-01'), baseSalary: 25000, departmentId: insabiDepts.sistemas.id, jobPositionId: puestos[13].id },
    { employeeNumber: 'ISB006', firstName: 'Elena', lastName: 'Gómez', secondLastName: 'Ruiz', email: 'elena.g@insabi.gob.mx', rfc: 'GORE880215DEF', curp: 'GORE880215MDFMZL06', nss: '60028219199', birthDate: new Date('1988-02-15'), gender: 'FEMALE' as const, maritalStatus: 'MARRIED' as const, hireDate: new Date('2019-04-01'), baseSalary: 28000, departmentId: insabiDepts.juridico.id, jobPositionId: puestos[13].id },
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

  console.log('✅ 26 Empleados creados (6-7 por empresa, incluyendo admin/RH/gerente)');

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
    // Conceptos para incidencias - percepciones
    prisma.payrollConcept.upsert({ where: { code: 'P010' }, update: {}, create: { code: 'P010', name: 'Bono por Incidencia', type: 'PERCEPTION', satCode: '038', isTaxable: true }}),
    prisma.payrollConcept.upsert({ where: { code: 'P011' }, update: {}, create: { code: 'P011', name: 'Ajuste Período Anterior (Percepción)', type: 'PERCEPTION', satCode: '038', isTaxable: true }}),
    prisma.payrollConcept.upsert({ where: { code: 'D001' }, update: {}, create: { code: 'D001', name: 'ISR', type: 'DEDUCTION', satCode: '002' }}),
    prisma.payrollConcept.upsert({ where: { code: 'D002' }, update: {}, create: { code: 'D002', name: 'IMSS Trabajador', type: 'DEDUCTION', satCode: '001' }}),
    prisma.payrollConcept.upsert({ where: { code: 'D003' }, update: {}, create: { code: 'D003', name: 'Fondo Ahorro Empleado', type: 'DEDUCTION', satCode: '004' }}),
    prisma.payrollConcept.upsert({ where: { code: 'D004' }, update: {}, create: { code: 'D004', name: 'INFONAVIT', type: 'DEDUCTION', satCode: '010' }}),
    // Conceptos para incidencias - deducciones
    prisma.payrollConcept.upsert({ where: { code: 'D010' }, update: {}, create: { code: 'D010', name: 'Descuento por Falta', type: 'DEDUCTION', satCode: '004' }}),
    prisma.payrollConcept.upsert({ where: { code: 'D011' }, update: {}, create: { code: 'D011', name: 'Descuento por Retardo', type: 'DEDUCTION', satCode: '004' }}),
    prisma.payrollConcept.upsert({ where: { code: 'D012' }, update: {}, create: { code: 'D012', name: 'Ajuste Período Anterior (Deducción)', type: 'DEDUCTION', satCode: '004' }}),
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
  // CREAR BENEFITS (PRESTACIONES EN TABLA BENEFIT)
  // ============================================

  // Prestaciones privadas comunes
  const benefitVales = await prisma.benefit.upsert({
    where: { id: 'benefit-vales' },
    update: {},
    create: { id: 'benefit-vales', name: 'Vales de Despensa', type: 'FOOD_VOUCHERS', valueType: 'FIXED_AMOUNT', value: 1500, description: 'Vales mensuales de despensa' },
  });

  const benefitFondoAhorro = await prisma.benefit.upsert({
    where: { id: 'benefit-fondo' },
    update: {},
    create: { id: 'benefit-fondo', name: 'Fondo de Ahorro', type: 'SAVINGS_FUND', valueType: 'PERCENTAGE_SALARY', value: 5, description: '5% aportación patronal' },
  });

  const benefitSeguroVida = await prisma.benefit.upsert({
    where: { id: 'benefit-seguro-vida' },
    update: {},
    create: { id: 'benefit-seguro-vida', name: 'Seguro de Vida', type: 'LIFE_INSURANCE', valueType: 'FIXED_AMOUNT', value: 500, description: 'Prima de seguro de vida' },
  });

  const benefitGMM = await prisma.benefit.upsert({
    where: { id: 'benefit-gmm' },
    update: {},
    create: { id: 'benefit-gmm', name: 'Gastos Médicos Mayores', type: 'MAJOR_MEDICAL', valueType: 'FIXED_AMOUNT', value: 2000, description: 'Seguro de gastos médicos' },
  });

  const benefitBonoAsistencia = await prisma.benefit.upsert({
    where: { id: 'benefit-asistencia' },
    update: {},
    create: { id: 'benefit-asistencia', name: 'Bono de Asistencia', type: 'ATTENDANCE_BONUS', valueType: 'FIXED_AMOUNT', value: 500, description: 'Bono mensual por asistencia perfecta' },
  });

  const benefitBonoPuntualidad = await prisma.benefit.upsert({
    where: { id: 'benefit-puntualidad' },
    update: {},
    create: { id: 'benefit-puntualidad', name: 'Bono de Puntualidad', type: 'PUNCTUALITY_BONUS', valueType: 'FIXED_AMOUNT', value: 500, description: 'Bono mensual por puntualidad' },
  });

  // Prestaciones de gobierno
  const benefitTransporte = await prisma.benefit.upsert({
    where: { id: 'benefit-transporte' },
    update: {},
    create: { id: 'benefit-transporte', name: 'Ayuda de Transporte', type: 'TRANSPORTATION', valueType: 'FIXED_AMOUNT', value: 800, description: 'Apoyo mensual de transporte' },
  });

  const benefitEstimulos = await prisma.benefit.upsert({
    where: { id: 'benefit-estimulos' },
    update: {},
    create: { id: 'benefit-estimulos', name: 'Estímulos al Desempeño', type: 'PRODUCTIVITY_BONUS', valueType: 'PERCENTAGE_SALARY', value: 10, description: '10% del salario' },
  });

  console.log('✅ Benefits (prestaciones) creados');

  // ============================================
  // ASIGNAR BENEFITS A EMPLEADOS POR EMPRESA
  // ============================================

  const assignedBenefits = [];

  // Obtener todos los empleados por empresa
  const bfsEmps = await prisma.employee.findMany({ where: { companyId: bfsCompany.id } });
  const techEmps = await prisma.employee.findMany({ where: { companyId: techCompany.id } });
  const norteEmps = await prisma.employee.findMany({ where: { companyId: norteCompany.id } });
  const insabiEmps = await prisma.employee.findMany({ where: { companyId: insabiCompany.id } });

  // BFS: Vales, Fondo Ahorro, Seguro Vida, Bono Asistencia
  for (const emp of bfsEmps) {
    for (const benefit of [benefitVales, benefitFondoAhorro, benefitSeguroVida, benefitBonoAsistencia]) {
      assignedBenefits.push({
        employeeId: emp.id,
        benefitId: benefit.id,
        startDate: emp.hireDate,
      });
    }
  }

  // Tech Solutions: Vales, Fondo Ahorro, GMM, Bono Puntualidad (empresa tech con mejores prestaciones)
  for (const emp of techEmps) {
    for (const benefit of [benefitVales, benefitFondoAhorro, benefitGMM, benefitBonoPuntualidad]) {
      assignedBenefits.push({
        employeeId: emp.id,
        benefitId: benefit.id,
        startDate: emp.hireDate,
      });
    }
  }

  // Comercializadora del Norte: Vales, Bono Asistencia (empresa con prestaciones básicas)
  for (const emp of norteEmps) {
    for (const benefit of [benefitVales, benefitBonoAsistencia]) {
      assignedBenefits.push({
        employeeId: emp.id,
        benefitId: benefit.id,
        startDate: emp.hireDate,
      });
    }
  }

  // INSABI (Gobierno): Transporte, Estímulos, Fondo Ahorro, Seguro Vida
  for (const emp of insabiEmps) {
    for (const benefit of [benefitTransporte, benefitEstimulos, benefitFondoAhorro, benefitSeguroVida]) {
      assignedBenefits.push({
        employeeId: emp.id,
        benefitId: benefit.id,
        startDate: emp.hireDate,
      });
    }
  }

  // Insertar todos los employee benefits
  for (const eb of assignedBenefits) {
    await prisma.employeeBenefit.upsert({
      where: { employeeId_benefitId: { employeeId: eb.employeeId, benefitId: eb.benefitId } },
      update: {},
      create: eb,
    });
  }

  console.log(`✅ ${assignedBenefits.length} Benefits asignados a empleados`);

  // ============================================
  // CREAR PRESTACIONES (PAYROLL CONCEPTS)
  // ============================================

  // Prestaciones generales (Ley Federal del Trabajo - LFT)
  await Promise.all([
    // Aguinaldo - 15 días mínimo por ley
    prisma.payrollConcept.upsert({ where: { code: 'PREST001' }, update: {}, create: { code: 'PREST001', name: 'Aguinaldo (15 días LFT)', type: 'PERCEPTION', satCode: '002', isTaxable: true, isFixed: false }}),
    // Prima Vacacional - 25% mínimo por ley
    prisma.payrollConcept.upsert({ where: { code: 'PREST002' }, update: {}, create: { code: 'PREST002', name: 'Prima Vacacional (25% LFT)', type: 'PERCEPTION', satCode: '021', isTaxable: true, isFixed: false }}),
    // Fondo de Ahorro (Aportación empresa)
    prisma.payrollConcept.upsert({ where: { code: 'PREST003' }, update: {}, create: { code: 'PREST003', name: 'Fondo de Ahorro Patronal', type: 'PERCEPTION', satCode: '005', isTaxable: false, isFixed: true }}),
    // Seguro de Vida
    prisma.payrollConcept.upsert({ where: { code: 'PREST004' }, update: {}, create: { code: 'PREST004', name: 'Seguro de Vida', type: 'PERCEPTION', satCode: '038', isTaxable: false, isFixed: true }}),
    // Seguro de Gastos Médicos Mayores
    prisma.payrollConcept.upsert({ where: { code: 'PREST005' }, update: {}, create: { code: 'PREST005', name: 'Seguro Gastos Médicos Mayores', type: 'PERCEPTION', satCode: '038', isTaxable: false, isFixed: true }}),
    // PTU - Reparto de Utilidades
    prisma.payrollConcept.upsert({ where: { code: 'PREST006' }, update: {}, create: { code: 'PREST006', name: 'PTU (Reparto Utilidades)', type: 'PERCEPTION', satCode: '003', isTaxable: true, isFixed: false }}),
  ]);

  // Prestaciones específicas de gobierno (ISSSTE)
  await Promise.all([
    // Aguinaldo gobierno - 40 días
    prisma.payrollConcept.upsert({ where: { code: 'GOB001' }, update: {}, create: { code: 'GOB001', name: 'Aguinaldo Gobierno (40 días)', type: 'PERCEPTION', satCode: '002', isTaxable: true, isFixed: false }}),
    // Prima Vacacional gobierno - 50%
    prisma.payrollConcept.upsert({ where: { code: 'GOB002' }, update: {}, create: { code: 'GOB002', name: 'Prima Vacacional Gobierno (50%)', type: 'PERCEPTION', satCode: '021', isTaxable: true, isFixed: false }}),
    // Estímulos al desempeño
    prisma.payrollConcept.upsert({ where: { code: 'GOB003' }, update: {}, create: { code: 'GOB003', name: 'Estímulos al Desempeño', type: 'PERCEPTION', satCode: '038', isTaxable: true, isFixed: false }}),
    // Ayuda para lentes
    prisma.payrollConcept.upsert({ where: { code: 'GOB004' }, update: {}, create: { code: 'GOB004', name: 'Ayuda para Lentes', type: 'PERCEPTION', satCode: '038', isTaxable: false, isFixed: false }}),
    // Canasta Navideña
    prisma.payrollConcept.upsert({ where: { code: 'GOB005' }, update: {}, create: { code: 'GOB005', name: 'Canasta Navideña', type: 'PERCEPTION', satCode: '038', isTaxable: false, isFixed: false }}),
    // Ayuda de transporte
    prisma.payrollConcept.upsert({ where: { code: 'GOB006' }, update: {}, create: { code: 'GOB006', name: 'Ayuda de Transporte', type: 'PERCEPTION', satCode: '038', isTaxable: false, isFixed: true }}),
  ]);

  // Deducciones específicas de gobierno (ISSSTE)
  await Promise.all([
    prisma.payrollConcept.upsert({ where: { code: 'DED_ISSSTE' }, update: {}, create: { code: 'DED_ISSSTE', name: 'ISSSTE Trabajador', type: 'DEDUCTION', satCode: '001' }}),
    prisma.payrollConcept.upsert({ where: { code: 'DED_FOVISSSTE' }, update: {}, create: { code: 'DED_FOVISSSTE', name: 'FOVISSSTE', type: 'DEDUCTION', satCode: '010' }}),
    prisma.payrollConcept.upsert({ where: { code: 'DED_SAR' }, update: {}, create: { code: 'DED_SAR', name: 'SAR', type: 'DEDUCTION', satCode: '017' }}),
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
  // CONFIGURACIÓN FISCAL: ISN POR ESTADO
  // ============================================

  // Tasas de ISN (Impuesto Sobre Nómina) por entidad federativa 2025
  const stateIsnConfigs = [
    { stateCode: 'AGS', stateName: 'Aguascalientes', rate: 0.0300 },
    { stateCode: 'BC', stateName: 'Baja California', rate: 0.0290 },
    { stateCode: 'BCS', stateName: 'Baja California Sur', rate: 0.0250 },
    { stateCode: 'CAM', stateName: 'Campeche', rate: 0.0300 },
    { stateCode: 'CHIS', stateName: 'Chiapas', rate: 0.0200 },
    { stateCode: 'CHIH', stateName: 'Chihuahua', rate: 0.0300 },
    { stateCode: 'CDMX', stateName: 'Ciudad de México', rate: 0.0300 },
    { stateCode: 'COAH', stateName: 'Coahuila', rate: 0.0300 },
    { stateCode: 'COL', stateName: 'Colima', rate: 0.0200 },
    { stateCode: 'DGO', stateName: 'Durango', rate: 0.0200 },
    { stateCode: 'GTO', stateName: 'Guanajuato', rate: 0.0295 },
    { stateCode: 'GRO', stateName: 'Guerrero', rate: 0.0200 },
    { stateCode: 'HGO', stateName: 'Hidalgo', rate: 0.0250 },
    { stateCode: 'JAL', stateName: 'Jalisco', rate: 0.0300 },
    { stateCode: 'MEX', stateName: 'Estado de México', rate: 0.0300 },
    { stateCode: 'MICH', stateName: 'Michoacán', rate: 0.0300 },
    { stateCode: 'MOR', stateName: 'Morelos', rate: 0.0200 },
    { stateCode: 'NAY', stateName: 'Nayarit', rate: 0.0250 },
    { stateCode: 'NL', stateName: 'Nuevo León', rate: 0.0300 },
    { stateCode: 'OAX', stateName: 'Oaxaca', rate: 0.0300 },
    { stateCode: 'PUE', stateName: 'Puebla', rate: 0.0300 },
    { stateCode: 'QRO', stateName: 'Querétaro', rate: 0.0300 },
    { stateCode: 'QROO', stateName: 'Quintana Roo', rate: 0.0300 },
    { stateCode: 'SLP', stateName: 'San Luis Potosí', rate: 0.0250 },
    { stateCode: 'SIN', stateName: 'Sinaloa', rate: 0.0265 },
    { stateCode: 'SON', stateName: 'Sonora', rate: 0.0225 },
    { stateCode: 'TAB', stateName: 'Tabasco', rate: 0.0300 },
    { stateCode: 'TAM', stateName: 'Tamaulipas', rate: 0.0300 },
    { stateCode: 'TLAX', stateName: 'Tlaxcala', rate: 0.0300 },
    { stateCode: 'VER', stateName: 'Veracruz', rate: 0.0300 },
    { stateCode: 'YUC', stateName: 'Yucatán', rate: 0.0300 },
    { stateCode: 'ZAC', stateName: 'Zacatecas', rate: 0.0250 },
  ];

  for (const config of stateIsnConfigs) {
    await prisma.stateIsnConfig.upsert({
      where: { stateCode: config.stateCode },
      update: { rate: config.rate, stateName: config.stateName },
      create: {
        stateCode: config.stateCode,
        stateName: config.stateName,
        rate: config.rate,
        effectiveFrom: new Date('2025-01-01'),
        isActive: true,
      },
    });
  }

  console.log('✅ Configuración de ISN por estado creada (32 estados)');

  // ============================================
  // VALORES FISCALES (UMA, SMG) POR AÑO
  // ============================================

  const fiscalValues = [
    {
      year: 2024,
      umaDaily: 108.57,
      umaMonthly: 3301.33,
      umaYearly: 39615.98,
      smgDaily: 248.93,
      smgZfnDaily: 374.89,
      effectiveFrom: new Date('2024-02-01'),
    },
    {
      year: 2025,
      umaDaily: 113.14, // Estimado 2025
      umaMonthly: 3440.50,
      umaYearly: 41286.00,
      smgDaily: 278.80, // Salario Mínimo General 2025
      smgZfnDaily: 419.88, // SMG Zona Frontera Norte 2025
      effectiveFrom: new Date('2025-01-01'),
    },
    {
      year: 2026,
      umaDaily: 117.89, // UMA 2026 (incremento ~4.2% INPC)
      umaMonthly: 3583.86,
      umaYearly: 43029.85,
      smgDaily: 312.26, // Salario Mínimo General 2026 (incremento ~12% CONASAMI)
      smgZfnDaily: 468.39, // SMG Zona Frontera Norte 2026
      effectiveFrom: new Date('2026-01-01'),
    },
  ];

  for (const fiscal of fiscalValues) {
    await prisma.fiscalValues.upsert({
      where: { year: fiscal.year },
      update: {
        umaDaily: fiscal.umaDaily,
        umaMonthly: fiscal.umaMonthly,
        umaYearly: fiscal.umaYearly,
        smgDaily: fiscal.smgDaily,
        smgZfnDaily: fiscal.smgZfnDaily,
      },
      create: {
        year: fiscal.year,
        umaDaily: fiscal.umaDaily,
        umaMonthly: fiscal.umaMonthly,
        umaYearly: fiscal.umaYearly,
        smgDaily: fiscal.smgDaily,
        smgZfnDaily: fiscal.smgZfnDaily,
        effectiveFrom: fiscal.effectiveFrom,
        aguinaldoDays: 15,
        vacationPremiumPercent: 0.25,
      },
    });
  }

  console.log('✅ Valores fiscales creados (UMA, SMG 2024-2026)');

  // ============================================
  // TABLA ISR 2025 (Mensual)
  // ============================================

  const isrTableMonthly2025 = [
    { lowerLimit: 0.01, upperLimit: 746.04, fixedFee: 0, rateOnExcess: 0.0192 },
    { lowerLimit: 746.05, upperLimit: 6332.05, fixedFee: 14.32, rateOnExcess: 0.0640 },
    { lowerLimit: 6332.06, upperLimit: 11128.01, fixedFee: 371.83, rateOnExcess: 0.1088 },
    { lowerLimit: 11128.02, upperLimit: 12935.82, fixedFee: 893.63, rateOnExcess: 0.1600 },
    { lowerLimit: 12935.83, upperLimit: 15487.71, fixedFee: 1182.88, rateOnExcess: 0.1792 },
    { lowerLimit: 15487.72, upperLimit: 31236.49, fixedFee: 1640.18, rateOnExcess: 0.2136 },
    { lowerLimit: 31236.50, upperLimit: 49233.00, fixedFee: 5004.12, rateOnExcess: 0.2352 },
    { lowerLimit: 49233.01, upperLimit: 93993.90, fixedFee: 9236.89, rateOnExcess: 0.3000 },
    { lowerLimit: 93993.91, upperLimit: 125325.20, fixedFee: 22665.17, rateOnExcess: 0.3200 },
    { lowerLimit: 125325.21, upperLimit: 375975.61, fixedFee: 32691.18, rateOnExcess: 0.3400 },
    { lowerLimit: 375975.62, upperLimit: 999999999.99, fixedFee: 117912.32, rateOnExcess: 0.3500 },
  ];

  for (const isr of isrTableMonthly2025) {
    await prisma.isrTable.upsert({
      where: {
        year_periodType_lowerLimit: {
          year: 2025,
          periodType: 'MONTHLY',
          lowerLimit: isr.lowerLimit,
        },
      },
      update: { upperLimit: isr.upperLimit, fixedFee: isr.fixedFee, rateOnExcess: isr.rateOnExcess },
      create: {
        year: 2025,
        periodType: 'MONTHLY',
        lowerLimit: isr.lowerLimit,
        upperLimit: isr.upperLimit,
        fixedFee: isr.fixedFee,
        rateOnExcess: isr.rateOnExcess,
      },
    });
  }

  console.log('✅ Tabla ISR 2025 mensual creada');

  // ============================================
  // TABLA ISR 2026 (Mensual)
  // Ajustada por inflación (~4.2% incremento en rangos)
  // ============================================

  const isrTableMonthly2026 = [
    { lowerLimit: 0.01, upperLimit: 777.37, fixedFee: 0, rateOnExcess: 0.0192 },
    { lowerLimit: 777.38, upperLimit: 6598.01, fixedFee: 14.92, rateOnExcess: 0.0640 },
    { lowerLimit: 6598.02, upperLimit: 11595.39, fixedFee: 387.49, rateOnExcess: 0.1088 },
    { lowerLimit: 11595.40, upperLimit: 13479.13, fixedFee: 931.16, rateOnExcess: 0.1600 },
    { lowerLimit: 13479.14, upperLimit: 16138.19, fixedFee: 1232.56, rateOnExcess: 0.1792 },
    { lowerLimit: 16138.20, upperLimit: 32548.42, fixedFee: 1709.07, rateOnExcess: 0.2136 },
    { lowerLimit: 32548.43, upperLimit: 51300.77, fixedFee: 5214.29, rateOnExcess: 0.2352 },
    { lowerLimit: 51300.78, upperLimit: 97941.64, fixedFee: 9624.84, rateOnExcess: 0.3000 },
    { lowerLimit: 97941.65, upperLimit: 130588.86, fixedFee: 23617.10, rateOnExcess: 0.3200 },
    { lowerLimit: 130588.87, upperLimit: 391766.58, fixedFee: 34064.59, rateOnExcess: 0.3400 },
    { lowerLimit: 391766.59, upperLimit: 999999999.99, fixedFee: 122865.01, rateOnExcess: 0.3500 },
  ];

  for (const isr of isrTableMonthly2026) {
    await prisma.isrTable.upsert({
      where: {
        year_periodType_lowerLimit: {
          year: 2026,
          periodType: 'MONTHLY',
          lowerLimit: isr.lowerLimit,
        },
      },
      update: { upperLimit: isr.upperLimit, fixedFee: isr.fixedFee, rateOnExcess: isr.rateOnExcess },
      create: {
        year: 2026,
        periodType: 'MONTHLY',
        lowerLimit: isr.lowerLimit,
        upperLimit: isr.upperLimit,
        fixedFee: isr.fixedFee,
        rateOnExcess: isr.rateOnExcess,
      },
    });
  }

  console.log('✅ Tabla ISR 2026 mensual creada');

  // ============================================
  // TABLA SUBSIDIO AL EMPLEO 2025 (Mensual)
  // ============================================

  const subsidioTable2025 = [
    { lowerLimit: 0.01, upperLimit: 1768.96, subsidyAmount: 407.02 },
    { lowerLimit: 1768.97, upperLimit: 2653.38, subsidyAmount: 406.83 },
    { lowerLimit: 2653.39, upperLimit: 3472.84, subsidyAmount: 406.62 },
    { lowerLimit: 3472.85, upperLimit: 3537.87, subsidyAmount: 392.77 },
    { lowerLimit: 3537.88, upperLimit: 4446.15, subsidyAmount: 382.46 },
    { lowerLimit: 4446.16, upperLimit: 4717.18, subsidyAmount: 354.23 },
    { lowerLimit: 4717.19, upperLimit: 5335.42, subsidyAmount: 324.87 },
    { lowerLimit: 5335.43, upperLimit: 6224.67, subsidyAmount: 294.63 },
    { lowerLimit: 6224.68, upperLimit: 7113.90, subsidyAmount: 253.54 },
    { lowerLimit: 7113.91, upperLimit: 7382.33, subsidyAmount: 217.61 },
    { lowerLimit: 7382.34, upperLimit: 999999999.99, subsidyAmount: 0 },
  ];

  for (const sub of subsidioTable2025) {
    await prisma.subsidioEmpleoTable.upsert({
      where: {
        year_periodType_lowerLimit: {
          year: 2025,
          periodType: 'MONTHLY',
          lowerLimit: sub.lowerLimit,
        },
      },
      update: { upperLimit: sub.upperLimit, subsidyAmount: sub.subsidyAmount },
      create: {
        year: 2025,
        periodType: 'MONTHLY',
        lowerLimit: sub.lowerLimit,
        upperLimit: sub.upperLimit,
        subsidyAmount: sub.subsidyAmount,
      },
    });
  }

  console.log('✅ Tabla Subsidio al Empleo 2025 creada');

  // ============================================
  // TABLA SUBSIDIO AL EMPLEO 2026 (Mensual)
  // Ajustada por inflación (~4.2% incremento en rangos)
  // ============================================

  const subsidioTable2026 = [
    { lowerLimit: 0.01, upperLimit: 1843.25, subsidyAmount: 424.11 },
    { lowerLimit: 1843.26, upperLimit: 2764.82, subsidyAmount: 423.92 },
    { lowerLimit: 2764.83, upperLimit: 3618.70, subsidyAmount: 423.70 },
    { lowerLimit: 3618.71, upperLimit: 3686.46, subsidyAmount: 409.27 },
    { lowerLimit: 3686.47, upperLimit: 4632.89, subsidyAmount: 398.52 },
    { lowerLimit: 4632.90, upperLimit: 4915.30, subsidyAmount: 369.11 },
    { lowerLimit: 4915.31, upperLimit: 5559.51, subsidyAmount: 338.51 },
    { lowerLimit: 5559.52, upperLimit: 6486.11, subsidyAmount: 307.01 },
    { lowerLimit: 6486.12, upperLimit: 7412.68, subsidyAmount: 264.19 },
    { lowerLimit: 7412.69, upperLimit: 7692.31, subsidyAmount: 226.75 },
    { lowerLimit: 7692.32, upperLimit: 999999999.99, subsidyAmount: 0 },
  ];

  for (const sub of subsidioTable2026) {
    await prisma.subsidioEmpleoTable.upsert({
      where: {
        year_periodType_lowerLimit: {
          year: 2026,
          periodType: 'MONTHLY',
          lowerLimit: sub.lowerLimit,
        },
      },
      update: { upperLimit: sub.upperLimit, subsidyAmount: sub.subsidyAmount },
      create: {
        year: 2026,
        periodType: 'MONTHLY',
        lowerLimit: sub.lowerLimit,
        upperLimit: sub.upperLimit,
        subsidyAmount: sub.subsidyAmount,
      },
    });
  }

  console.log('✅ Tabla Subsidio al Empleo 2026 creada');

  // ============================================
  // CONFIGURACIÓN DE NÓMINA POR EMPRESA
  // ============================================

  // BFS Ingeniería (Aguascalientes)
  await prisma.companyPayrollConfig.upsert({
    where: { companyId: bfsCompany.id },
    update: {},
    create: {
      companyId: bfsCompany.id,
      defaultPeriodType: 'BIWEEKLY',
      stateCode: 'AGS',
      applyIsn: true,
      aguinaldoDays: 15,
      vacationPremiumPercent: 0.25,
      applyPtu: true,
      ptuPercent: 0.10,
      savingsFundEnabled: true,
      savingsFundEmployeePercent: 0.05,
      savingsFundCompanyPercent: 0.05,
      foodVouchersEnabled: true,
      overtimeDoubleAfter: 9,
      overtimeTripleAfter: 3,
      applySubsidioEmpleo: true,
    },
  });

  // Tech Solutions (CDMX)
  await prisma.companyPayrollConfig.upsert({
    where: { companyId: techCompany.id },
    update: {},
    create: {
      companyId: techCompany.id,
      defaultPeriodType: 'BIWEEKLY',
      stateCode: 'CDMX',
      applyIsn: true,
      aguinaldoDays: 30, // Empresa tech con mejores prestaciones
      vacationPremiumPercent: 0.25,
      applyPtu: true,
      ptuPercent: 0.10,
      savingsFundEnabled: true,
      savingsFundEmployeePercent: 0.05,
      savingsFundCompanyPercent: 0.05,
      foodVouchersEnabled: true,
      overtimeDoubleAfter: 9,
      overtimeTripleAfter: 3,
      applySubsidioEmpleo: true,
    },
  });

  // Comercializadora del Norte (Nuevo León)
  await prisma.companyPayrollConfig.upsert({
    where: { companyId: norteCompany.id },
    update: {},
    create: {
      companyId: norteCompany.id,
      defaultPeriodType: 'WEEKLY',
      stateCode: 'NL',
      applyIsn: true,
      aguinaldoDays: 15,
      vacationPremiumPercent: 0.25,
      applyPtu: true,
      ptuPercent: 0.10,
      savingsFundEnabled: false,
      foodVouchersEnabled: true,
      overtimeDoubleAfter: 9,
      overtimeTripleAfter: 3,
      applySubsidioEmpleo: true,
    },
  });

  // INSABI (Gobierno CDMX)
  await prisma.companyPayrollConfig.upsert({
    where: { companyId: insabiCompany.id },
    update: {},
    create: {
      companyId: insabiCompany.id,
      defaultPeriodType: 'BIWEEKLY',
      stateCode: 'CDMX',
      applyIsn: false, // Gobierno exento
      aguinaldoDays: 40, // Gobierno 40 días
      vacationPremiumPercent: 0.50, // Gobierno 50%
      applyPtu: false, // Gobierno no aplica PTU
      ptuPercent: 0,
      savingsFundEnabled: true,
      savingsFundEmployeePercent: 0.05,
      savingsFundCompanyPercent: 0.05,
      foodVouchersEnabled: false,
      overtimeDoubleAfter: 9,
      overtimeTripleAfter: 3,
      applySubsidioEmpleo: true,
    },
  });

  console.log('✅ Configuración de nómina por empresa creada');

  // ============================================
  // TASAS IMSS 2025
  // ============================================

  const imssRates2025 = [
    // Enfermedades y Maternidad (EyM) - Prestaciones en especie (Cuota fija)
    { concept: 'EYM_CUOTA_FIJA', employerRate: 0.2040, employeeRate: 0, salaryBase: 'SMG' },
    // EyM - Prestaciones en especie (Excedente 3 SMG)
    { concept: 'EYM_EXCEDENTE', employerRate: 0.0110, employeeRate: 0.0040, salaryBase: 'SBC' },
    // EyM - Prestaciones en dinero
    { concept: 'EYM_DINERO', employerRate: 0.0070, employeeRate: 0.0025, salaryBase: 'SBC' },
    // EyM - Gastos médicos pensionados
    { concept: 'EYM_PENSIONADOS', employerRate: 0.0105, employeeRate: 0.00375, salaryBase: 'SBC' },
    // Invalidez y Vida (IV)
    { concept: 'IV', employerRate: 0.0175, employeeRate: 0.00625, salaryBase: 'SBC' },
    // Retiro
    { concept: 'RCV_RETIRO', employerRate: 0.02, employeeRate: 0, salaryBase: 'SBC' },
    // Cesantía en edad avanzada y vejez (empleador 2025)
    { concept: 'RCV_CESANTIA_PATRONAL', employerRate: 0.04375, employeeRate: 0, salaryBase: 'SBC' },
    // Cesantía en edad avanzada y vejez (trabajador)
    { concept: 'RCV_CESANTIA_TRABAJADOR', employerRate: 0, employeeRate: 0.01125, salaryBase: 'SBC' },
    // Riesgo de Trabajo (varía por clase, aquí Clase I)
    { concept: 'RT_CLASE_I', employerRate: 0.0054355, employeeRate: 0, salaryBase: 'SBC' },
    { concept: 'RT_CLASE_II', employerRate: 0.0113065, employeeRate: 0, salaryBase: 'SBC' },
    { concept: 'RT_CLASE_III', employerRate: 0.025984, employeeRate: 0, salaryBase: 'SBC' },
    { concept: 'RT_CLASE_IV', employerRate: 0.0465325, employeeRate: 0, salaryBase: 'SBC' },
    { concept: 'RT_CLASE_V', employerRate: 0.0758875, employeeRate: 0, salaryBase: 'SBC' },
    // Guarderías y Prestaciones Sociales
    { concept: 'GUARDERIA', employerRate: 0.01, employeeRate: 0, salaryBase: 'SBC' },
    // INFONAVIT
    { concept: 'INFONAVIT', employerRate: 0.05, employeeRate: 0, salaryBase: 'SBC' },
  ];

  for (const rate of imssRates2025) {
    await prisma.imssRate.upsert({
      where: { year_concept: { year: 2025, concept: rate.concept }},
      update: { employerRate: rate.employerRate, employeeRate: rate.employeeRate, salaryBase: rate.salaryBase as any },
      create: {
        year: 2025,
        concept: rate.concept,
        employerRate: rate.employerRate,
        employeeRate: rate.employeeRate,
        salaryBase: rate.salaryBase as any,
      },
    });
  }

  console.log('✅ Tasas IMSS 2025 creadas');

  // ============================================
  // TASAS IMSS 2026
  // Nota: RCV_CESANTIA_PATRONAL aumenta a 5.150% según reforma 2020
  // La cuota patronal de cesantía aumenta 0.775% anual hasta 2030
  // ============================================

  const imssRates2026 = [
    // Enfermedades y Maternidad (EyM) - Prestaciones en especie (Cuota fija)
    { concept: 'EYM_CUOTA_FIJA', employerRate: 0.2040, employeeRate: 0, salaryBase: 'SMG' },
    // EyM - Prestaciones en especie (Excedente 3 SMG)
    { concept: 'EYM_EXCEDENTE', employerRate: 0.0110, employeeRate: 0.0040, salaryBase: 'SBC' },
    // EyM - Prestaciones en dinero
    { concept: 'EYM_DINERO', employerRate: 0.0070, employeeRate: 0.0025, salaryBase: 'SBC' },
    // EyM - Gastos médicos pensionados
    { concept: 'EYM_PENSIONADOS', employerRate: 0.0105, employeeRate: 0.00375, salaryBase: 'SBC' },
    // Invalidez y Vida (IV)
    { concept: 'IV', employerRate: 0.0175, employeeRate: 0.00625, salaryBase: 'SBC' },
    // Retiro
    { concept: 'RCV_RETIRO', employerRate: 0.02, employeeRate: 0, salaryBase: 'SBC' },
    // Cesantía en edad avanzada y vejez (empleador 2026 - INCREMENTO por reforma 2020)
    { concept: 'RCV_CESANTIA_PATRONAL', employerRate: 0.05150, employeeRate: 0, salaryBase: 'SBC' },
    // Cesantía en edad avanzada y vejez (trabajador - sin cambio)
    { concept: 'RCV_CESANTIA_TRABAJADOR', employerRate: 0, employeeRate: 0.01125, salaryBase: 'SBC' },
    // Riesgo de Trabajo (varía por clase)
    { concept: 'RT_CLASE_I', employerRate: 0.0054355, employeeRate: 0, salaryBase: 'SBC' },
    { concept: 'RT_CLASE_II', employerRate: 0.0113065, employeeRate: 0, salaryBase: 'SBC' },
    { concept: 'RT_CLASE_III', employerRate: 0.025984, employeeRate: 0, salaryBase: 'SBC' },
    { concept: 'RT_CLASE_IV', employerRate: 0.0465325, employeeRate: 0, salaryBase: 'SBC' },
    { concept: 'RT_CLASE_V', employerRate: 0.0758875, employeeRate: 0, salaryBase: 'SBC' },
    // Guarderías y Prestaciones Sociales
    { concept: 'GUARDERIA', employerRate: 0.01, employeeRate: 0, salaryBase: 'SBC' },
    // INFONAVIT
    { concept: 'INFONAVIT', employerRate: 0.05, employeeRate: 0, salaryBase: 'SBC' },
  ];

  for (const rate of imssRates2026) {
    await prisma.imssRate.upsert({
      where: { year_concept: { year: 2026, concept: rate.concept }},
      update: { employerRate: rate.employerRate, employeeRate: rate.employeeRate, salaryBase: rate.salaryBase as any },
      create: {
        year: 2026,
        concept: rate.concept,
        employerRate: rate.employerRate,
        employeeRate: rate.employeeRate,
        salaryBase: rate.salaryBase as any,
      },
    });
  }

  console.log('✅ Tasas IMSS 2026 creadas (incluye incremento RCV patronal por reforma 2020)');

  // ============================================
  // CATÁLOGO DE PACs AUTORIZADOS SAT
  // Lista completa actualizada al 30/12/2025
  // ============================================

  const pacProviders = [
    // PAC de desarrollo/sandbox interno
    {
      code: 'SANDBOX',
      name: 'Sandbox (Desarrollo)',
      legalName: 'Modo de desarrollo interno',
      integrationType: 'INTERNAL',
      isOfficial: false,
      isImplemented: true,
      isFeatured: true,
      sortOrder: 1,
      notes: 'PAC simulado para desarrollo y pruebas. No genera CFDIs válidos ante el SAT.',
    },
    // PACs con implementación conocida
    {
      code: 'FINKOK',
      name: 'Finkok',
      legalName: 'Pegaso Tecnología, S.A. de C.V.',
      sandboxStampUrl: 'https://demo-facturacion.finkok.com/servicios/soap/stamp',
      productionStampUrl: 'https://facturacion.finkok.com/servicios/soap/stamp',
      sandboxCancelUrl: 'https://demo-facturacion.finkok.com/servicios/soap/cancel',
      productionCancelUrl: 'https://facturacion.finkok.com/servicios/soap/cancel',
      integrationType: 'SOAP',
      documentationUrl: 'https://wiki.finkok.com/',
      websiteUrl: 'https://www.finkok.com',
      isOfficial: true,
      isImplemented: true,
      isFeatured: true,
      sortOrder: 2,
    },
    {
      code: 'SW_SAPIEN',
      name: 'SW sapien',
      legalName: 'Solución Integral de Facturación Electrónica e Informática SIFEI, S.A. de C.V.',
      sandboxStampUrl: 'https://services.test.sw.com.mx/cfdi33/stamp/v4',
      productionStampUrl: 'https://services.sw.com.mx/cfdi33/stamp/v4',
      sandboxCancelUrl: 'https://services.test.sw.com.mx/cfdi33/cancel',
      productionCancelUrl: 'https://services.sw.com.mx/cfdi33/cancel',
      integrationType: 'REST',
      documentationUrl: 'https://developers.sw.com.mx/',
      websiteUrl: 'https://sw.com.mx',
      isOfficial: true,
      isImplemented: true,
      isFeatured: true,
      sortOrder: 3,
    },
    // Lista completa de PACs autorizados SAT (ordenados alfabéticamente)
    { code: 'DIGIBOX', name: 'Digibox', legalName: 'Digibox, S.A. de C.V.', sortOrder: 10 },
    { code: 'AKVAL', name: 'AKVAL', legalName: 'AKVAL Servicios de Facturación Electrónica, S.A. de C.V.', sortOrder: 11 },
    { code: 'FACTURAGEPP', name: 'Facturagepp', legalName: 'Servicios Administrativos Suma, S. de R.L. de C.V.', sortOrder: 12 },
    { code: 'EDICOM', name: 'Edicom', legalName: 'Edicomunicaciones México, S.A. de C.V.', sortOrder: 13 },
    { code: 'DIVERZA', name: 'Diverza', legalName: 'Soluciones de Negocio FNX, S.A. de C.V.', sortOrder: 14 },
    { code: 'TRALIX', name: 'Tralix', legalName: 'Tralix México, S. de R.L. de C.V.', sortOrder: 15 },
    { code: 'ATEB', name: 'ATEB', legalName: 'ATEB Servicios, S.A. de C.V.', sortOrder: 16 },
    { code: 'SOLUPAC', name: 'SOLUPAC', legalName: 'Teléfonos de México, S.A.B. de C.V.', sortOrder: 17 },
    { code: 'CONTPAQI', name: 'CONTPAQi', legalName: 'Másfacturación, S. de R.L. de C.V.', sortOrder: 18 },
    { code: 'SOLUCION_FACTIBLE', name: 'Solución Factible', legalName: 'SFERP, S.C.', sortOrder: 19 },
    { code: 'KONESH', name: 'Konesh Soluciones', legalName: 'Aurorian, S.A. de C.V.', sortOrder: 20 },
    { code: 'INTERFACTURA', name: 'INTERFACTURA', legalName: 'Interfactura, S.A.P.I. de C.V.', sortOrder: 21 },
    { code: 'MASFACTURA', name: 'Masfactura', legalName: 'Masteredí, S.A. de C.V.', sortOrder: 22 },
    { code: 'COMERCIO_DIGITAL', name: 'Comercio Digital', legalName: 'Sistemas de Comercio Digital, S. de R.L. de C.V.', sortOrder: 23 },
    { code: 'EMITE', name: 'Emite - Soluciones Fiscales Digitales', legalName: 'Emite Facturación, S.A. de C.V.', sortOrder: 24 },
    { code: 'INVOICEONE', name: 'InvoiceOne', legalName: 'Sistemas de Emisión Digital, S.A. de C.V.', sortOrder: 25 },
    { code: 'DIGITAL_FACTURA', name: 'Digital Factura', legalName: 'Impresos de Caber, S.A. de C.V.', sortOrder: 26 },
    { code: 'SIFEI', name: 'Sifei', legalName: 'Solución Integral de Facturación Electrónica e Informática SIFEI, S.A. de C.V.', sortOrder: 27 },
    { code: 'NT_LINK', name: 'NT Link Comunicaciones', legalName: 'NT Link Comunicaciones, S.A. de C.V.', sortOrder: 28 },
    { code: 'FACTURA_FACILMENTE', name: 'Factura Fácilmente.com', legalName: 'Factura Fácilmente de México, S.A. de C.V.', sortOrder: 29 },
    { code: 'CERTUS_FACTURE_HOY', name: 'CertusFactureHoy.com', legalName: 'Certus Aplicaciones Digitales, S.A. de C.V.', sortOrder: 30 },
    { code: 'FACTUREYA', name: 'FactureYa', legalName: 'Servicios Tecnológicos Avanzados en Facturación, S.A. de C.V.', sortOrder: 31 },
    { code: 'MISC_FOLIOS', name: 'MISC- FOLIOS (EDX-PAC)', legalName: 'Servicios Tecnológicos, S.A.P.I. de C.V.', sortOrder: 32 },
    { code: 'B1SOFT', name: 'B1SOFT Latinoamérica', legalName: 'Servicios Tecnológicos B1 Soft, S.A. de C.V.', sortOrder: 33 },
    { code: 'ESTELA', name: 'ESTELA', legalName: 'Servicio y Soporte en Tecnología Informática, S.A. de C.V.', sortOrder: 34 },
    { code: 'SOVOS', name: 'Sovos', legalName: 'Advantage Security, S. de R.L. de C.V.', sortOrder: 35 },
    { code: 'FACTURIZATE', name: 'Facturizate - EDC Invoice', legalName: 'Carvajal Tecnología y Servicios, S.A. de C.V.', sortOrder: 36 },
    { code: 'MYSUITE', name: 'MYSuite', legalName: 'Mysuite Services, S.A. de C.V.', sortOrder: 37 },
    { code: 'FORMAS_DIGITALES', name: 'Formas Digitales', legalName: 'Formas Continuas de Guadalajara, S.A. de C.V.', sortOrder: 38 },
    { code: 'QUADRUM', name: 'Quadrum', legalName: 'Centro de Validación Digital CVDSA, S.A. de C.V.', sortOrder: 39 },
    { code: 'STOFACTURA', name: 'STOFactura', legalName: 'Servicios, Tecnología y Organización, S.A. de C.V.', sortOrder: 40 },
    { code: 'EDIFACTMX', name: 'EdiFactMx', legalName: 'EDIFACTMX, S.A. de C.V.', sortOrder: 41 },
    { code: 'ECODEX', name: 'E CODEX', legalName: 'Desarrollo Corporativo de Negocios en Tecnología de la Información, S.A. de C.V.', sortOrder: 42 },
    { code: 'FACTURADOR_ELECTRONICO', name: 'Facturadorelectronico.com', legalName: 'Dot Net Desarrollo de Sistemas, S.A. de C.V.', sortOrder: 43 },
    { code: 'TSYS', name: 'TSYS', legalName: 'Total System Services de México, S.A. de C.V.', sortOrder: 44 },
    { code: 'CECOBAN', name: 'CECOBAN', legalName: 'Cecoban, S.A. de C.V.', sortOrder: 45 },
    { code: 'SIIGO_ASPEL', name: 'Siigo Aspel', legalName: 'Total Solutions Provider, S.A. de C.V.', sortOrder: 46 },
    { code: 'CERTIFAC', name: 'Certifac', legalName: 'CER - Consultoría y Respuesta Estratégica, S.A. de C.V.', sortOrder: 47 },
    { code: 'LUNA_SOFT', name: 'Luna Soft', legalName: 'Luna Soft, S.A. de C.V.', sortOrder: 48 },
    { code: 'FABRICA_JABON', name: 'Fábrica de Jabón la Corona', legalName: 'Fábrica de Jabón La Corona, S.A. de C.V.', sortOrder: 49 },
    { code: 'PRODIGIA', name: 'PRODIGIA', legalName: 'Prodigia Procesos Digitales Administrativos, S.A. de C.V.', sortOrder: 50 },
    { code: 'PRODITMA', name: 'PRODITMA', legalName: 'PRODITMA, S.A. de C.V.', sortOrder: 51 },
    { code: '4G_FACTOR', name: '4G FACTOR SA DE CV', legalName: '4G Factor, S.A. de C.V.', sortOrder: 52 },
    { code: 'FACTRONICA', name: 'Factrónica', legalName: 'Factrónica, S. de R.L. de C.V.', sortOrder: 53 },
    { code: 'DETECNO', name: 'DETECNO', legalName: 'DETECNO, S.A. de C.V.', sortOrder: 54 },
    { code: 'EXPIDETUFACTURA', name: 'ExpidetuFactura', legalName: 'CPA Control de Comprobantes Digitales, S. de R.L. de C.V.', sortOrder: 55 },
    { code: 'DIGIFACT', name: 'DigiFact (Teledesic)', legalName: 'Teledesic Broadband Networks, S.A. de C.V.', sortOrder: 56 },
    { code: 'E_FACTURA', name: 'e-factura.net', legalName: 'Sociedad de Explotación de Redes Electrónicas y Servs. de México, S.A. de C.V.', sortOrder: 57 },
    { code: 'TIMBOX', name: 'Timbox', legalName: 'IT &SW Development Solutions de México, S. de R.L. de C.V.', sortOrder: 58 },
    { code: 'TURBOPAC', name: 'TurboPac', legalName: 'Qrea-t Solutions, S.A. de C.V.', sortOrder: 59 },
    { code: 'CERTIFICACION_CFDI', name: 'Certificación CFDI', legalName: 'Certificación CFDI, S.A.P.I. de C.V.', sortOrder: 60 },
  ];

  for (const pac of pacProviders) {
    await prisma.pacProvider.upsert({
      where: { code: pac.code },
      update: {
        name: pac.name,
        legalName: pac.legalName,
        sandboxStampUrl: pac.sandboxStampUrl,
        productionStampUrl: pac.productionStampUrl,
        sandboxCancelUrl: pac.sandboxCancelUrl,
        productionCancelUrl: pac.productionCancelUrl,
        integrationType: pac.integrationType || 'SOAP',
        documentationUrl: pac.documentationUrl,
        websiteUrl: pac.websiteUrl,
        isOfficial: pac.isOfficial ?? true,
        isImplemented: pac.isImplemented ?? false,
        isFeatured: pac.isFeatured ?? false,
        sortOrder: pac.sortOrder,
        notes: pac.notes,
      },
      create: {
        code: pac.code,
        name: pac.name,
        legalName: pac.legalName,
        sandboxStampUrl: pac.sandboxStampUrl,
        productionStampUrl: pac.productionStampUrl,
        sandboxCancelUrl: pac.sandboxCancelUrl,
        productionCancelUrl: pac.productionCancelUrl,
        integrationType: pac.integrationType || 'SOAP',
        documentationUrl: pac.documentationUrl,
        websiteUrl: pac.websiteUrl,
        isOfficial: pac.isOfficial ?? true,
        isImplemented: pac.isImplemented ?? false,
        isFeatured: pac.isFeatured ?? false,
        sortOrder: pac.sortOrder,
        notes: pac.notes,
      },
    });
  }

  console.log(`✅ Catálogo de PACs creado (${pacProviders.length} proveedores)`);

  // ============================================
  // CONFIGURAR JERARQUÍAS DE EMPLEADOS
  // ============================================

  // Obtener empleados por número para configurar jerarquías
  const getEmployeeByNumber = async (empNumber: string) => {
    return prisma.employee.findUnique({ where: { employeeNumber: empNumber } });
  };

  // BFS: Estructura jerárquica
  // BFS000 = Admin Roberto (top level admin)
  // BFS001 = RH Patricia (top level RH)
  // BFS002 = Gerente Ricardo (top level operaciones, supervisa a empleados)
  // BFS003-BFS006 = Empleados regulares que reportan al gerente
  const bfs000 = await getEmployeeByNumber('BFS000'); // Roberto - Admin
  const bfs001 = await getEmployeeByNumber('BFS001'); // Patricia - RH
  const bfs002 = await getEmployeeByNumber('BFS002'); // Ricardo - Gerente
  const bfs003 = await getEmployeeByNumber('BFS003'); // David - Dev
  const bfs004 = await getEmployeeByNumber('BFS004'); // Carmen - Dev
  const bfs005 = await getEmployeeByNumber('BFS005'); // Miguel - Admin
  const bfs006 = await getEmployeeByNumber('BFS006'); // Ana - Ops

  // Admin y RH son top level
  if (bfs000) await prisma.employee.update({ where: { id: bfs000.id }, data: { hierarchyLevel: 0 } });
  if (bfs001) await prisma.employee.update({ where: { id: bfs001.id }, data: { hierarchyLevel: 0 } });
  if (bfs002) await prisma.employee.update({ where: { id: bfs002.id }, data: { hierarchyLevel: 0 } });

  // Empleados reportan al gerente
  if (bfs002 && bfs003) await prisma.employee.update({ where: { id: bfs003.id }, data: { supervisorId: bfs002.id, hierarchyLevel: 1 } });
  if (bfs002 && bfs004) await prisma.employee.update({ where: { id: bfs004.id }, data: { supervisorId: bfs002.id, hierarchyLevel: 1 } });
  if (bfs001 && bfs005) await prisma.employee.update({ where: { id: bfs005.id }, data: { supervisorId: bfs001.id, hierarchyLevel: 1 } });
  if (bfs002 && bfs006) await prisma.employee.update({ where: { id: bfs006.id }, data: { supervisorId: bfs002.id, hierarchyLevel: 1 } });

  // Tech Solutions: Estructura jerárquica
  // TECH000 = Admin María (top level admin)
  // TECH001 = RH Andrea (top level RH)
  // TECH002 = Gerente Fernando (top level dev, supervisa desarrolladores)
  // TECH003-TECH006 = Empleados regulares
  const tech000 = await getEmployeeByNumber('TECH000'); // María - Admin
  const tech001 = await getEmployeeByNumber('TECH001'); // Andrea - RH
  const tech002 = await getEmployeeByNumber('TECH002'); // Fernando - Gerente Dev
  const tech003 = await getEmployeeByNumber('TECH003'); // Gabriela - QA
  const tech004 = await getEmployeeByNumber('TECH004'); // Alejandro - Dev
  const tech005 = await getEmployeeByNumber('TECH005'); // Sofía - PM
  const tech006 = await getEmployeeByNumber('TECH006'); // Carlos - Dev

  if (tech000) await prisma.employee.update({ where: { id: tech000.id }, data: { hierarchyLevel: 0 } });
  if (tech001) await prisma.employee.update({ where: { id: tech001.id }, data: { hierarchyLevel: 0 } });
  if (tech002) await prisma.employee.update({ where: { id: tech002.id }, data: { hierarchyLevel: 0 } });

  if (tech001 && tech003) await prisma.employee.update({ where: { id: tech003.id }, data: { supervisorId: tech001.id, hierarchyLevel: 1 } });
  if (tech002 && tech004) await prisma.employee.update({ where: { id: tech004.id }, data: { supervisorId: tech002.id, hierarchyLevel: 1 } });
  if (tech001 && tech005) await prisma.employee.update({ where: { id: tech005.id }, data: { supervisorId: tech001.id, hierarchyLevel: 1 } });
  if (tech002 && tech006) await prisma.employee.update({ where: { id: tech006.id }, data: { supervisorId: tech002.id, hierarchyLevel: 1 } });

  // Comercializadora del Norte: Estructura jerárquica
  // NTE000 = Admin Juan (top level admin)
  // NTE001 = RH Monica (top level RH)
  // NTE002-NTE005 = Empleados regulares
  const nte000 = await getEmployeeByNumber('NTE000'); // Juan - Admin
  const nte001 = await getEmployeeByNumber('NTE001'); // Monica - RH
  const nte002 = await getEmployeeByNumber('NTE002'); // Jorge - Ventas
  const nte003 = await getEmployeeByNumber('NTE003'); // Lucia - Ventas
  const nte004 = await getEmployeeByNumber('NTE004'); // Roberto - Almacén
  const nte005 = await getEmployeeByNumber('NTE005'); // Diana - Finanzas

  if (nte000) await prisma.employee.update({ where: { id: nte000.id }, data: { hierarchyLevel: 0 } });
  if (nte001) await prisma.employee.update({ where: { id: nte001.id }, data: { hierarchyLevel: 0 } });
  if (nte002) await prisma.employee.update({ where: { id: nte002.id }, data: { hierarchyLevel: 0 } }); // Jorge es jefe de ventas

  if (nte002 && nte003) await prisma.employee.update({ where: { id: nte003.id }, data: { supervisorId: nte002.id, hierarchyLevel: 1 } });
  if (nte002 && nte004) await prisma.employee.update({ where: { id: nte004.id }, data: { supervisorId: nte002.id, hierarchyLevel: 1 } });
  if (nte001 && nte005) await prisma.employee.update({ where: { id: nte005.id }, data: { supervisorId: nte001.id, hierarchyLevel: 1 } });

  // INSABI (Gobierno): Estructura jerárquica
  // ISB000 = Admin Pedro (top level admin)
  // ISB001 = RH Laura (top level RH)
  // ISB002 = Director Carlos (top level médico)
  // ISB003-ISB006 = Empleados regulares
  const isb000 = await getEmployeeByNumber('ISB000'); // Pedro - Admin
  const isb001 = await getEmployeeByNumber('ISB001'); // Laura - RH
  const isb002 = await getEmployeeByNumber('ISB002'); // Carlos - Director
  const isb003 = await getEmployeeByNumber('ISB003'); // Ricardo - Médico
  const isb004 = await getEmployeeByNumber('ISB004'); // Ana - Enfermera
  const isb005 = await getEmployeeByNumber('ISB005'); // José - Sistemas
  const isb006 = await getEmployeeByNumber('ISB006'); // Elena - Jurídico

  if (isb000) await prisma.employee.update({ where: { id: isb000.id }, data: { hierarchyLevel: 0 } });
  if (isb001) await prisma.employee.update({ where: { id: isb001.id }, data: { hierarchyLevel: 0 } });
  if (isb002) await prisma.employee.update({ where: { id: isb002.id }, data: { hierarchyLevel: 0 } });

  if (isb002 && isb003) await prisma.employee.update({ where: { id: isb003.id }, data: { supervisorId: isb002.id, hierarchyLevel: 1 } });
  if (isb003 && isb004) await prisma.employee.update({ where: { id: isb004.id }, data: { supervisorId: isb003.id, hierarchyLevel: 2 } });
  if (isb001 && isb005) await prisma.employee.update({ where: { id: isb005.id }, data: { supervisorId: isb001.id, hierarchyLevel: 1 } });
  if (isb001 && isb006) await prisma.employee.update({ where: { id: isb006.id }, data: { supervisorId: isb001.id, hierarchyLevel: 1 } });

  console.log('✅ Jerarquías de empleados configuradas');

  // ============================================
  // CREAR REGISTROS DE ASISTENCIA
  // ============================================

  // Crear registros de asistencia para los últimos 15 días hábiles + hoy
  const todayDate = new Date();
  const attendanceRecords: Array<{
    employeeId: string;
    date: Date;
    checkIn: Date;
    checkOut: Date | null;
    breakStart: Date | null;
    breakEnd: Date | null;
    status: 'PRESENT' | 'LATE' | 'EARLY_LEAVE';
    hoursWorked: number | null;
  }> = [];

  // Función para obtener días hábiles recientes (excluyendo fines de semana)
  const getRecentWorkdays = (count: number): Date[] => {
    const workdays: Date[] = [];
    let current = new Date(todayDate);
    current.setHours(0, 0, 0, 0);

    // Incluir hoy si es día hábil
    const todayDayOfWeek = current.getDay();
    if (todayDayOfWeek !== 0 && todayDayOfWeek !== 6) {
      workdays.push(new Date(current));
    }

    while (workdays.length < count) {
      current.setDate(current.getDate() - 1);
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No domingo ni sábado
        workdays.push(new Date(current));
      }
    }
    return workdays.reverse();
  };

  const recentWorkdays = getRecentWorkdays(15);

  // Generar asistencia para todos los empleados
  for (const emp of allEmployees) {
    for (let i = 0; i < recentWorkdays.length; i++) {
      const workday = recentWorkdays[i];
      const isToday = workday.toDateString() === todayDate.toDateString();

      // 10% probabilidad de faltar (excepto hoy)
      if (!isToday && Math.random() < 0.1) {
        continue; // Simular falta
      }

      // Simular hora de entrada (entre 7:45 y 8:20)
      const baseHour = 8;
      const minuteVariation = Math.floor(Math.random() * 35) - 15; // -15 a +20 minutos
      const checkIn = new Date(workday);

      if (minuteVariation < 0) {
        checkIn.setHours(7, 60 + minuteVariation, Math.floor(Math.random() * 60), 0);
      } else {
        checkIn.setHours(baseHour, minuteVariation, Math.floor(Math.random() * 60), 0);
      }

      // Simular hora de salida (entre 17:00 y 18:30) - solo si no es hoy
      let checkOut: Date | null = null;
      let breakStart: Date | null = null;
      let breakEnd: Date | null = null;
      let hoursWorked: number | null = null;

      if (!isToday) {
        // Hora de comida (13:00-14:00 aproximadamente)
        breakStart = new Date(workday);
        breakStart.setHours(13, Math.floor(Math.random() * 15), 0, 0);

        breakEnd = new Date(workday);
        breakEnd.setHours(14, Math.floor(Math.random() * 15), 0, 0);

        // Hora de salida
        checkOut = new Date(workday);
        const checkOutHour = 17 + Math.floor(Math.random() * 2);
        const checkOutMinute = Math.floor(Math.random() * 60);
        checkOut.setHours(checkOutHour, checkOutMinute, 0, 0);

        // Calcular horas trabajadas (restando hora de comida)
        const totalMs = checkOut.getTime() - checkIn.getTime();
        const breakMs = breakEnd.getTime() - breakStart.getTime();
        hoursWorked = Math.round(((totalMs - breakMs) / (1000 * 60 * 60)) * 100) / 100;
      }

      // Determinar estado
      let status: 'PRESENT' | 'LATE' | 'EARLY_LEAVE' = 'PRESENT';
      if (checkIn.getHours() > 8 || (checkIn.getHours() === 8 && checkIn.getMinutes() > 5)) {
        status = 'LATE';
      }
      if (checkOut && checkOut.getHours() < 17) {
        status = 'EARLY_LEAVE';
      }

      attendanceRecords.push({
        employeeId: emp.id,
        date: workday,
        checkIn,
        checkOut,
        breakStart,
        breakEnd,
        status,
        hoursWorked,
      });
    }
  }

  // Insertar registros de asistencia
  for (const record of attendanceRecords) {
    await prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId: record.employeeId,
          date: record.date,
        },
      },
      update: {
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        breakStart: record.breakStart,
        breakEnd: record.breakEnd,
        status: record.status,
        hoursWorked: record.hoursWorked,
      },
      create: {
        employeeId: record.employeeId,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        breakStart: record.breakStart,
        breakEnd: record.breakEnd,
        status: record.status,
        hoursWorked: record.hoursWorked,
      },
    });
  }

  console.log(`✅ ${attendanceRecords.length} registros de asistencia creados (últimos 15 días hábiles + hoy)`);

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
  console.log('   🔑 Admin Empresa: admin@bfs.com.mx / admin123');
  console.log('   RH: rh@bfs.com.mx / admin123');
  console.log('   Gerente: gerente@bfs.com.mx / admin123');
  console.log('   Empleados: david.sc@bfs.com.mx, patricia.g@bfs.com.mx, etc.');
  console.log('   📦 Prestaciones: Vales, Fondo Ahorro, Seguro Vida, Bono Asistencia');
  console.log('\n🏢 TECH SOLUTIONS MÉXICO (Color: Morado):');
  console.log('   🔑 Admin Empresa: admin@techsolutions.mx / admin123');
  console.log('   RH: rh@techsolutions.mx / admin123');
  console.log('   Gerente: gerente@techsolutions.mx / admin123');
  console.log('   Empleados: andrea.r@techsolutions.mx, fernando.c@techsolutions.mx, etc.');
  console.log('   📦 Prestaciones: Vales, Fondo Ahorro, GMM, Bono Puntualidad');
  console.log('\n🏢 COMERCIALIZADORA DEL NORTE (Color: Verde):');
  console.log('   🔑 Admin Empresa: admin@comnorte.mx / admin123');
  console.log('   RH: rh@comnorte.mx / admin123');
  console.log('   Empleados: monica.v@comnorte.mx, jorge.t@comnorte.mx, etc.');
  console.log('   📦 Prestaciones: Vales, Bono Asistencia (básicas)');
  console.log('\n🏛️ INSABI - GOBIERNO (Color: Guinda/Dorado, ISSSTE):');
  console.log('   🔑 Admin Empresa: admin@insabi.gob.mx / admin123');
  console.log('   RH: rh@insabi.gob.mx / admin123');
  console.log('   Director: director@insabi.gob.mx / admin123');
  console.log('   Empleados: carlos.h@insabi.gob.mx, laura.m@insabi.gob.mx, etc.');
  console.log('   📦 Prestaciones: Transporte, Estímulos, Fondo Ahorro, Seguro Vida');
  console.log('   🔸 Aguinaldo 40 días, Prima Vacacional 50%');
  console.log('   🔸 Deducciones: ISSSTE, FOVISSSTE, SAR');
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN:');
  console.log('   - 4 Empresas con diferentes colores/configuraciones');
  console.log('   - 26 Empleados (6-7 por empresa, incluyendo admin/RH/gerente)');
  console.log('   - 1 Super Admin + 4 Admin Empresa + 4 RH + 4 Gerentes/Directores + empleados');
  console.log('   - Emails de usuarios coinciden con emails de empleados para pruebas');
  console.log('   - Cada empresa tiene su Admin que aprueba nóminas de SU empresa');
  console.log('   - Prestaciones LFT: Aguinaldo, Prima Vacacional, Vales, etc.');
  console.log('   - Prestaciones Gobierno: ISSSTE, FOVISSSTE, SAR, Estímulos');
  console.log('   - Vacaciones según LFT Art. 76 (0 días primer año, 12 días al cumplir 1 año)');
  console.log('   - Registros de asistencia de los últimos 5 días hábiles');
  console.log('='.repeat(60));
  console.log('\n💼 CONFIGURACIÓN FISCAL:');
  console.log('   - 32 estados con tasas ISN (Impuesto Sobre Nómina)');
  console.log('   - Valores fiscales UMA/SMG 2024-2025');
  console.log('   - Tablas ISR 2025 (mensual)');
  console.log('   - Tablas Subsidio al Empleo 2025');
  console.log('   - Tasas IMSS 2025 (todas las ramas)');
  console.log('   - Configuración de nómina por empresa');
  console.log('='.repeat(60));
}

main()
  .then(async () => {
    // Ejecutar seed de módulos del sistema
    console.log('\n🌱 Ejecutando seed de módulos del sistema...');
    await seedSystemModules();
    // Ejecutar seed del portal del empleado
    console.log('\n🌱 Ejecutando seed del portal del empleado...');
    await seedPortal();
  })
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// ============================================
// SEED DE MÓDULOS DEL SISTEMA
// ============================================

async function seedSystemModules() {
  console.log('📦 Creando módulos del sistema...');

  const systemModules = [
    // CORE - Módulos esenciales (no se pueden desactivar)
    { code: 'employees', name: 'Empleados', description: 'Gestión de empleados', category: 'CORE', isCore: true, defaultEnabled: true, icon: 'users', sortOrder: 1 },
    { code: 'users', name: 'Usuarios', description: 'Gestión de usuarios del sistema', category: 'CORE', isCore: true, defaultEnabled: true, icon: 'user-circle', sortOrder: 2 },
    { code: 'departments', name: 'Departamentos', description: 'Estructura organizacional', category: 'CORE', isCore: true, defaultEnabled: true, icon: 'building-office', sortOrder: 3 },

    // PAYROLL - Nómina
    { code: 'payroll', name: 'Nómina', description: 'Procesamiento de nómina', category: 'PAYROLL', isCore: false, defaultEnabled: true, icon: 'currency-dollar', sortOrder: 10 },
    { code: 'cfdi', name: 'Timbrado CFDI', description: 'Generación y timbrado de recibos fiscales', category: 'PAYROLL', isCore: false, defaultEnabled: true, icon: 'document-check', sortOrder: 11 },

    // ATTENDANCE - Asistencia
    { code: 'attendance', name: 'Control de Asistencia', description: 'Registro de entradas y salidas', category: 'ATTENDANCE', isCore: false, defaultEnabled: true, icon: 'clock', sortOrder: 20 },
    { code: 'biometric', name: 'Dispositivos Biométricos', description: 'Integración con dispositivos biométricos', category: 'ATTENDANCE', isCore: false, defaultEnabled: false, icon: 'finger-print', sortOrder: 21 },
    { code: 'whatsapp_attendance', name: 'Checador por WhatsApp', description: 'Registro de asistencia vía WhatsApp', category: 'INTEGRATION', isCore: false, defaultEnabled: false, icon: 'chat-bubble-left-right', sortOrder: 22 },

    // HR - Recursos Humanos
    { code: 'vacations', name: 'Vacaciones y Permisos', description: 'Gestión de vacaciones y permisos', category: 'HR', isCore: false, defaultEnabled: true, icon: 'sun', sortOrder: 30 },
    { code: 'benefits', name: 'Beneficios', description: 'Gestión de beneficios para empleados', category: 'HR', isCore: false, defaultEnabled: true, icon: 'gift', sortOrder: 31 },
    { code: 'incidents', name: 'Incidencias', description: 'Gestión de incidencias laborales', category: 'HR', isCore: false, defaultEnabled: true, icon: 'exclamation-triangle', sortOrder: 32 },

    // PORTAL - Portal del empleado
    { code: 'portal', name: 'Portal del Empleado', description: 'Autoservicio para empleados', category: 'PORTAL', isCore: false, defaultEnabled: true, icon: 'user-group', sortOrder: 40 },

    // REPORTS - Reportes
    { code: 'reports', name: 'Reportes Avanzados', description: 'Reportes y análisis avanzados', category: 'REPORTS', isCore: false, defaultEnabled: true, icon: 'chart-bar', sortOrder: 50 },

    // INTEGRATION - Integraciones
    { code: 'ai_chatbot', name: 'ChatBot IA para RRHH', description: 'Asistente de IA para consultas de empleados', category: 'INTEGRATION', isCore: false, defaultEnabled: false, icon: 'sparkles', sortOrder: 60 },
    { code: 'n8n_integration', name: 'Integración n8n', description: 'Automatización de workflows con n8n', category: 'INTEGRATION', isCore: false, defaultEnabled: false, icon: 'puzzle-piece', sortOrder: 61 },
  ];

  for (const module of systemModules) {
    await prisma.systemModule.upsert({
      where: { code: module.code },
      update: {
        name: module.name,
        description: module.description,
        category: module.category as any,
        isCore: module.isCore,
        defaultEnabled: module.defaultEnabled,
        icon: module.icon,
        sortOrder: module.sortOrder,
      },
      create: {
        code: module.code,
        name: module.name,
        description: module.description,
        category: module.category as any,
        isCore: module.isCore,
        defaultEnabled: module.defaultEnabled,
        icon: module.icon,
        sortOrder: module.sortOrder,
      },
    });
  }

  console.log(`✅ ${systemModules.length} módulos del sistema creados/actualizados`);
}

// ============================================
// SEED DEL PORTAL DEL EMPLEADO
// ============================================
async function seedPortal() {
  // Get the first company for portal data
  const companies = await prisma.company.findMany();
  if (companies.length === 0) {
    console.log('❌ No hay empresas registradas para el portal.');
    return;
  }

  for (const company of companies) {
    console.log(`📦 Creando datos del portal para: ${company.name}`);

    // Get employees for this company
    const employees = await prisma.employee.findMany({
      where: { companyId: company.id },
      take: 10,
    });

    // ============================================
    // DESCUENTOS CORPORATIVOS
    // ============================================
    const discountsData = [
      {
        companyId: company.id,
        partnerCompany: 'Gimnasio FitLife',
        description: 'Descuento en membresía mensual para empleados y familia',
        discount: '30%',
        category: 'HEALTH' as const,
        url: 'https://fitlife.com',
        validUntil: new Date('2026-12-31'),
      },
      {
        companyId: company.id,
        partnerCompany: 'Óptica Visión',
        description: 'Descuento en lentes y consultas oftalmológicas',
        discount: '25%',
        category: 'HEALTH' as const,
        code: 'EMP2026',
      },
      {
        companyId: company.id,
        partnerCompany: 'Universidad TecMilenio',
        description: 'Descuento en colegiaturas de licenciatura y maestría',
        discount: '20%',
        category: 'EDUCATION' as const,
        url: 'https://tecmilenio.mx',
      },
      {
        companyId: company.id,
        partnerCompany: 'Cine Cinemex',
        description: 'Boletos a precio especial todos los días',
        discount: '2x1 Miércoles',
        category: 'ENTERTAINMENT' as const,
        code: 'CORP2026',
      },
    ];

    for (const discount of discountsData) {
      try {
        await prisma.companyDiscount.create({ data: discount });
      } catch (e) {
        // Ignore duplicates
      }
    }

    // ============================================
    // CONVENIOS INSTITUCIONALES
    // ============================================
    const agreementsData = [
      {
        companyId: company.id,
        institutionName: 'FONACOT',
        description: 'Créditos para trabajadores formales con descuento vía nómina',
        benefits: ['Tasa preferencial', 'Descuento vía nómina', 'Aprobación rápida', 'Sin aval'],
        url: 'https://fonacot.gob.mx',
      },
      {
        companyId: company.id,
        institutionName: 'INFONAVIT',
        description: 'Crédito para vivienda y mejoras del hogar',
        benefits: ['Puntos acumulados', 'Subcuenta de vivienda', 'Asesoría gratuita'],
        contact: 'rh@empresa.com',
      },
      {
        companyId: company.id,
        institutionName: 'Caja de Ahorro Empresarial',
        description: 'Programa de ahorro y préstamos internos',
        benefits: ['Préstamos al 1% mensual', 'Ahorro con rendimientos', 'Sin buró de crédito'],
        contact: 'caja.ahorro@empresa.com',
      },
    ];

    for (const agreement of agreementsData) {
      try {
        await prisma.companyAgreement.create({ data: agreement });
      } catch (e) {
        // Ignore duplicates
      }
    }

    // ============================================
    // BADGES / INSIGNIAS
    // ============================================
    const badgesData = [
      {
        companyId: company.id,
        name: 'Primer Año',
        description: 'Completaste tu primer año en la empresa',
        color: '#10B981',
        category: 'MILESTONE' as const,
        criteria: 'Cumplir 1 año de antigüedad',
        points: 100,
      },
      {
        companyId: company.id,
        name: 'Cinco Años',
        description: 'Cinco años de compromiso y dedicación',
        color: '#3B82F6',
        category: 'MILESTONE' as const,
        criteria: 'Cumplir 5 años de antigüedad',
        points: 500,
      },
      {
        companyId: company.id,
        name: 'Asistencia Perfecta',
        description: 'Sin faltas durante el trimestre',
        color: '#8B5CF6',
        category: 'ACHIEVEMENT' as const,
        criteria: 'Cero faltas en 3 meses consecutivos',
        points: 150,
      },
      {
        companyId: company.id,
        name: 'Capacitación Completa',
        description: 'Completaste todos los cursos obligatorios',
        color: '#EC4899',
        category: 'TRAINING' as const,
        criteria: 'Completar 100% de cursos obligatorios',
        points: 200,
      },
    ];

    const badges = [];
    for (const badge of badgesData) {
      try {
        const created = await prisma.badge.create({ data: badge });
        badges.push(created);
      } catch (e) {
        // Ignore duplicates
      }
    }

    // ============================================
    // CURSOS
    // ============================================
    const coursesData = [
      {
        companyId: company.id,
        title: 'Inducción a la Empresa',
        description: 'Conoce la historia, misión, visión y valores de la empresa.',
        provider: 'Recursos Humanos',
        category: 'ONBOARDING' as const,
        duration: '4 horas',
        points: 50,
        isMandatory: true,
      },
      {
        companyId: company.id,
        title: 'Seguridad e Higiene',
        description: 'Protocolos de seguridad y prevención de accidentes.',
        provider: 'Seguridad Industrial',
        category: 'SAFETY' as const,
        duration: '3 horas',
        points: 75,
        isMandatory: true,
      },
      {
        companyId: company.id,
        title: 'Excel Avanzado',
        description: 'Fórmulas avanzadas, tablas dinámicas y macros.',
        provider: 'LinkedIn Learning',
        category: 'TECHNICAL' as const,
        duration: '8 horas',
        points: 100,
        isMandatory: false,
      },
      {
        companyId: company.id,
        title: 'Comunicación Efectiva',
        description: 'Mejora tus habilidades de comunicación laboral.',
        provider: 'Desarrollo Organizacional',
        category: 'SOFT_SKILLS' as const,
        duration: '6 horas',
        points: 80,
        isMandatory: false,
      },
    ];

    const courses = [];
    for (const course of coursesData) {
      try {
        const created = await prisma.course.create({ data: course });
        courses.push(created);
      } catch (e) {
        // Ignore duplicates
      }
    }

    // ============================================
    // ENCUESTAS
    // ============================================
    try {
      await prisma.survey.create({
        data: {
          companyId: company.id,
          title: 'Encuesta de Clima Laboral 2026',
          description: 'Tu opinión es importante. Esta encuesta nos ayuda a mejorar.',
          type: 'CLIMATE',
          startsAt: new Date(),
          endsAt: new Date('2026-03-31'),
          isAnonymous: true,
          isPublished: true,
          questions: {
            create: [
              { questionText: '¿Qué tan satisfecho estás con tu ambiente de trabajo?', type: 'RATING', isRequired: true, orderIndex: 0 },
              { questionText: '¿Sientes que tu trabajo es valorado?', type: 'RATING', isRequired: true, orderIndex: 1 },
              { questionText: '¿Te sientes parte de un equipo?', type: 'YES_NO', isRequired: true, orderIndex: 2 },
              { questionText: '¿Qué aspectos mejorarías?', type: 'TEXT', isRequired: false, orderIndex: 3 },
            ],
          },
        },
      });
    } catch (e) {
      // Ignore if exists
    }

    try {
      await prisma.survey.create({
        data: {
          companyId: company.id,
          title: 'Satisfacción con Prestaciones',
          description: 'Queremos conocer tu opinión sobre las prestaciones.',
          type: 'SATISFACTION',
          startsAt: new Date(),
          endsAt: new Date('2026-02-28'),
          isAnonymous: true,
          isPublished: true,
          questions: {
            create: [
              { questionText: '¿Qué tan satisfecho estás con las prestaciones?', type: 'RATING', isRequired: true, orderIndex: 0 },
              { questionText: '¿Cuál prestación valoras más?', type: 'MULTIPLE_CHOICE', options: ['Vales de despensa', 'Fondo de ahorro', 'Seguro médico', 'Vacaciones', 'Otro'], isRequired: true, orderIndex: 1 },
              { questionText: '¿Recomendarías trabajar aquí?', type: 'YES_NO', isRequired: true, orderIndex: 2 },
            ],
          },
        },
      });
    } catch (e) {
      // Ignore if exists
    }

    // Assign badges and courses to some employees
    if (employees.length > 0 && badges.length > 0) {
      for (let i = 0; i < Math.min(2, employees.length); i++) {
        const employee = employees[i];
        const badge = badges[i % badges.length];
        try {
          await prisma.employeeBadge.create({
            data: { badgeId: badge.id, employeeId: employee.id, reason: 'Asignado automáticamente' },
          });
        } catch (e) {
          // Ignore duplicates
        }
      }
    }

    if (employees.length > 0 && courses.length > 0) {
      for (const employee of employees.slice(0, 3)) {
        for (const course of courses.filter(c => c.isMandatory)) {
          try {
            await prisma.courseEnrollment.create({
              data: { courseId: course.id, employeeId: employee.id, status: 'NOT_STARTED', progress: 0 },
            });
          } catch (e) {
            // Ignore duplicates
          }
        }
      }
    }

    // Create recognitions between employees
    if (employees.length >= 2) {
      try {
        await prisma.recognition.create({
          data: {
            companyId: company.id,
            employeeId: employees[0].id,
            givenById: employees[1].id,
            type: 'TEAMWORK',
            title: 'Excelente trabajo en equipo',
            message: 'Gracias por tu colaboración en el proyecto. Tu apoyo fue fundamental.',
            points: 50,
            isPublic: true,
          },
        });
      } catch (e) {
        // Ignore
      }
    }
  }

  console.log('✅ Seed del portal completado');
}
