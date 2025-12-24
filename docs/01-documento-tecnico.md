# Documento Técnico del Sistema de Nómina

## 1. Información General

### 1.1 Nombre del Sistema
**Sistema de Nómina - Nomina MX**

### 1.2 Versión
1.0.0

### 1.3 Propósito
Sistema integral de gestión de nómina empresarial diseñado para cumplir con las normativas mexicanas (IMSS, ISSSTE, SAT, INFONAVIT). Permite la administración completa del ciclo de nómina, desde la gestión de empleados hasta la generación de recibos CFDI 4.0.

---

## 2. Arquitectura del Sistema

### 2.1 Arquitectura General
El sistema utiliza una arquitectura de tres capas:

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                      │
│                 (Frontend - React + Vite)                    │
│    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│    │Dashboard│ │Empleados│ │ Nómina  │ │Reportes │         │
│    └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     CAPA DE NEGOCIO                          │
│                  (Backend - NestJS)                          │
│    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│    │  Auth   │ │Payroll  │ │  CFDI   │ │Employees│         │
│    │ Module  │ │ Module  │ │ Module  │ │ Module  │         │
│    └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CAPA DE DATOS                           │
│                (PostgreSQL + Prisma ORM)                     │
│    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│    │  Users  │ │Employees│ │ Payroll │ │Companies│         │
│    │  Table  │ │  Table  │ │ Tables  │ │  Table  │         │
│    └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnológico

#### Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.x | Framework UI |
| TypeScript | 5.x | Tipado estático |
| Vite | 5.x | Build tool y dev server |
| TailwindCSS | 3.x | Framework CSS |
| React Query | 5.x | Estado del servidor |
| React Router | 6.x | Enrutamiento |
| React Hook Form | 7.x | Manejo de formularios |
| Recharts | 2.x | Gráficas y visualizaciones |
| Axios | 1.x | Cliente HTTP |

#### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 20.x | Runtime |
| NestJS | 10.x | Framework backend |
| TypeScript | 5.x | Tipado estático |
| Prisma | 5.x | ORM |
| PostgreSQL | 15.x | Base de datos |
| JWT | - | Autenticación |
| Passport | - | Estrategias de auth |
| ExcelJS | 4.x | Generación de Excel |
| class-validator | - | Validación de DTOs |

#### Infraestructura
| Tecnología | Propósito |
|------------|-----------|
| Docker | Contenedorización |
| Docker Compose | Orquestación local |
| Nginx | Proxy reverso (producción) |

---

## 3. Estructura del Proyecto

### 3.1 Estructura del Backend

```
backend/
├── prisma/
│   ├── schema.prisma          # Esquema de base de datos
│   └── migrations/            # Migraciones
├── src/
│   ├── common/
│   │   ├── decorators/        # Decoradores personalizados
│   │   ├── guards/            # Guards de autenticación
│   │   └── prisma/            # Servicio Prisma
│   ├── modules/
│   │   ├── auth/              # Autenticación y autorización
│   │   ├── employees/         # Gestión de empleados
│   │   ├── payroll/           # Cálculo de nómina
│   │   ├── cfdi/              # Generación CFDI
│   │   ├── attendance/        # Control de asistencia
│   │   ├── vacations/         # Gestión de vacaciones
│   │   ├── benefits/          # Prestaciones
│   │   ├── incidents/         # Incidencias
│   │   ├── reports/           # Reportes
│   │   ├── catalogs/          # Catálogos del SAT
│   │   ├── devices/           # Dispositivos biométricos
│   │   ├── system-config/     # Configuración del sistema
│   │   └── accounting-config/ # Configuración contable
│   ├── app.module.ts          # Módulo principal
│   └── main.ts                # Punto de entrada
├── Dockerfile
└── package.json
```

### 3.2 Estructura del Frontend

```
frontend/
├── public/
├── src/
│   ├── components/            # Componentes reutilizables
│   │   ├── Layout.tsx
│   │   └── SearchableSelect.tsx
│   ├── contexts/              # Contextos de React
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── SystemConfigContext.tsx
│   ├── pages/                 # Páginas/Vistas
│   │   ├── DashboardPage.tsx
│   │   ├── EmployeesPage.tsx
│   │   ├── PayrollPage.tsx
│   │   └── ...
│   ├── services/
│   │   └── api.ts             # Cliente API
│   ├── App.tsx
│   └── main.tsx
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## 4. Modelo de Datos

### 4.1 Entidades Principales

#### Usuario (User)
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  firstName String
  lastName  String
  isActive  Boolean  @default(true)
  roleId    String
  role      Role     @relation(...)
  companyId String?
  company   Company? @relation(...)
}
```

#### Empleado (Employee)
```prisma
model Employee {
  id              String   @id @default(uuid())
  employeeNumber  String   @unique
  firstName       String
  lastName        String
  email           String?
  curp            String   @unique
  rfc             String   @unique
  nss             String?
  birthDate       DateTime
  hireDate        DateTime
  baseSalary      Decimal
  paymentType     PaymentType
  contractType    ContractType
  status          EmployeeStatus
  companyId       String
  departmentId    String
  jobPositionId   String
  workScheduleId  String?
  bankId          String?
  bankAccount     String?
  clabe           String?
}
```

#### Nómina (Payroll)
```prisma
model Payroll {
  id           String   @id @default(uuid())
  companyId    String
  periodId     String
  employeeId   String
  baseSalary   Decimal
  workedDays   Decimal
  totalEarnings Decimal
  totalDeductions Decimal
  netPay       Decimal
  status       PayrollStatus
  cfdiUuid     String?
  cfdiXml      String?
  cfdiPdf      String?
}
```

### 4.2 Diagrama Entidad-Relación (Simplificado)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Company   │◄──────│  Employee   │───────│  Department │
└─────────────┘       └──────┬──────┘       └─────────────┘
                             │
                             │
                      ┌──────▼──────┐
                      │   Payroll   │
                      └──────┬──────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐┌──────▼──────┐┌──────▼──────┐
       │  Earnings   ││ Deductions  ││   Period    │
       └─────────────┘└─────────────┘└─────────────┘
```

---

## 5. APIs y Endpoints

### 5.1 Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /auth/login | Iniciar sesión |
| POST | /auth/register | Registrar usuario |
| GET | /auth/profile | Obtener perfil actual |

### 5.2 Empleados
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /employees | Listar empleados |
| GET | /employees/:id | Obtener empleado |
| POST | /employees | Crear empleado |
| PATCH | /employees/:id | Actualizar empleado |
| DELETE | /employees/:id | Eliminar empleado |

### 5.3 Nómina
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /payroll/periods | Listar periodos |
| POST | /payroll/periods | Crear periodo |
| GET | /payroll/calculate | Calcular nómina |
| POST | /payroll/process | Procesar nómina |
| GET | /payroll/receipts | Obtener recibos |

### 5.4 CFDI
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /cfdi/generate | Generar CFDI |
| POST | /cfdi/stamp | Timbrar CFDI |
| POST | /cfdi/cancel | Cancelar CFDI |

---

## 6. Seguridad

### 6.1 Autenticación
- JWT (JSON Web Tokens) con expiración configurable
- Refresh tokens para sesiones prolongadas
- Passwords hasheados con bcrypt (salt rounds: 12)

### 6.2 Autorización
- Role-Based Access Control (RBAC)
- Roles: admin, company_admin, rh, manager, employee
- Guards personalizados en NestJS

### 6.3 Protección de Datos
- HTTPS obligatorio en producción
- Sanitización de inputs
- Validación de DTOs con class-validator
- Prepared statements (Prisma ORM)

### 6.4 Certificados Digitales
- Almacenamiento seguro de certificados CER/KEY
- Encriptación de passwords de certificados
- Validación de vigencia de certificados

---

## 7. Configuración del Sistema

### 7.1 Variables de Entorno

#### Backend (.env)
```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/nomina"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Servidor
PORT=3000
NODE_ENV=development
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
```

### 7.2 Configuraciones del Sistema
El sistema permite configurar:
- **MULTI_COMPANY_ENABLED**: Habilita/deshabilita modo multiempresa
- **SYSTEM_NAME**: Nombre del sistema
- **DEFAULT_LANGUAGE**: Idioma por defecto

---

## 8. Integraciones

### 8.1 SAT - CFDI 4.0
- Generación de XML según esquema del SAT
- Timbrado mediante PAC autorizado
- Catálogos actualizados del SAT

### 8.2 IMSS
- Cálculo de cuotas obrero-patronales
- Generación de reportes SUA
- Integración con IDSE

### 8.3 INFONAVIT
- Descuentos automáticos
- Generación de reportes

### 8.4 Dispositivos Biométricos
- Soporte para marcas: ZKTeco, Anviz, Suprema
- Modos de conexión: PULL (polling) y PUSH (webhook)
- Sincronización de registros de asistencia

---

## 9. Performance

### 9.1 Optimizaciones
- Lazy loading de módulos en frontend
- Paginación en listados
- Índices en base de datos
- Caché con React Query
- Compresión gzip en producción

### 9.2 Límites Recomendados
| Recurso | Límite |
|---------|--------|
| Empleados por empresa | 10,000 |
| Registros de nómina por consulta | 1,000 |
| Tamaño máximo de archivo | 10 MB |

---

## 10. Mantenimiento

### 10.1 Logs
- Logs de aplicación con Winston (backend)
- Logs de acceso HTTP
- Logs de auditoría para acciones críticas

### 10.2 Backups
- Backup diario de base de datos recomendado
- Retención de 30 días mínimo
- Backup de certificados digitales

### 10.3 Monitoreo
- Health checks en /health
- Métricas de uso de API
- Alertas de errores críticos

---

## 11. Cumplimiento Normativo

### 11.1 Normativas Fiscales
- CFDI 4.0 (Comprobante Fiscal Digital por Internet)
- Nómina 1.2 (Complemento de nómina)
- Catálogos SAT actualizados

### 11.2 Normativas Laborales
- Ley Federal del Trabajo
- Ley del Seguro Social
- Ley del INFONAVIT
- Ley del ISR

### 11.3 Protección de Datos
- Ley Federal de Protección de Datos Personales

---

## 12. Glosario

| Término | Definición |
|---------|------------|
| CFDI | Comprobante Fiscal Digital por Internet |
| PAC | Proveedor Autorizado de Certificación |
| SAT | Servicio de Administración Tributaria |
| IMSS | Instituto Mexicano del Seguro Social |
| ISSSTE | Instituto de Seguridad y Servicios Sociales de los Trabajadores del Estado |
| INFONAVIT | Instituto del Fondo Nacional de la Vivienda para los Trabajadores |
| ISR | Impuesto Sobre la Renta |
| ISN | Impuesto Sobre Nóminas |
| SUA | Sistema Único de Autodeterminación |
| CURP | Clave Única de Registro de Población |
| RFC | Registro Federal de Contribuyentes |
| NSS | Número de Seguridad Social |

---

*Documento generado: Diciembre 2024*
*Versión del documento: 1.0*
