-- Migration: Update Role System to 7 Explicit Roles
-- This migration updates the existing roles and adds new ones

-- Update existing roles to new naming convention
UPDATE roles SET name = 'SYSTEM_ADMIN', description = 'Administrador del Sistema - Acceso total al sistema' WHERE name = 'admin';
UPDATE roles SET name = 'COMPANY_ADMIN', description = 'Administrador de Empresa - Gestión completa de la empresa' WHERE name = 'company_admin';
UPDATE roles SET name = 'HR_ADMIN', description = 'Administrador de RH - Gestión de empleados y RH' WHERE name = 'rh';
UPDATE roles SET name = 'MANAGER', description = 'Gerente - Gestión de equipo' WHERE name = 'manager';
UPDATE roles SET name = 'EMPLOYEE', description = 'Empleado - Acceso a información propia' WHERE name = 'employee';

-- Insert new roles if they don't exist
INSERT INTO roles (id, name, description, permissions, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'PAYROLL_ADMIN',
  'Administrador de Nómina - Procesamiento de nómina',
  '["employees:read:company","payroll:read:company","payroll:write:company","payroll:calculate:company","payroll:preview:company","payroll:stamp:company","payroll:cancel:company","incidents:read:company","vacations:read:company","benefits:read:company","reports:read:company","reports:export:company","profile:read:own","profile:write:own"]'::json,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'PAYROLL_ADMIN');

INSERT INTO roles (id, name, description, permissions, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'AUDITOR',
  'Auditor - Acceso de solo lectura para auditoría',
  '["employees:read:company","payroll:read:company","incidents:read:company","vacations:read:company","benefits:read:company","reports:read:company","reports:export:company","audit:read:company","audit:export:company","settings:read:company"]'::json,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'AUDITOR');

-- Update permissions for existing roles
UPDATE roles SET permissions = '["*","system:config","system:maintenance","companies:*","users:*","employees:*","payroll:*","incidents:*","vacations:*","benefits:*","reports:*","settings:*","audit:*"]'::json WHERE name = 'SYSTEM_ADMIN';

UPDATE roles SET permissions = '["users:read:company","users:write:company","users:create:company","employees:*:company","payroll:*:company","payroll:approve","incidents:*:company","incidents:approve","vacations:*:company","vacations:approve","benefits:*:company","benefits:approve","reports:*:company","settings:read:company","settings:write:company","audit:read:company"]'::json WHERE name = 'COMPANY_ADMIN';

UPDATE roles SET permissions = '["employees:read:company","employees:write:company","employees:create:company","employees:deactivate:company","incidents:*:company","vacations:*:company","vacations:approve:company","benefits:read:company","benefits:write:company","benefits:assign:company","reports:read:company","reports:export:company","profile:read:own","profile:write:own","attendance:*:company"]'::json WHERE name = 'HR_ADMIN';

UPDATE roles SET permissions = '["employees:read:subordinates","incidents:read:subordinates","incidents:create:subordinates","vacations:read:subordinates","vacations:approve:subordinates","payroll:read:subordinates","reports:read:subordinates","attendance:read:subordinates","attendance:approve:subordinates","profile:read:own","profile:write:own","payroll:read:own","vacations:create:own","vacations:read:own","incidents:read:own","benefits:read:own","attendance:read:own","attendance:clock:own"]'::json WHERE name = 'MANAGER';

UPDATE roles SET permissions = '["profile:read:own","profile:write:own","payroll:read:own","vacations:create:own","vacations:read:own","vacations:cancel:own","incidents:read:own","benefits:read:own","attendance:read:own","attendance:clock:own","documents:read:own","documents:download:own"]'::json WHERE name = 'EMPLOYEE';
