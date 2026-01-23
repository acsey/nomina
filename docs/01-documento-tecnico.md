# Documento Técnico del Sistema de Nómina

## 1. Información General

### 1.1 Nombre del Sistema
**Sistema de Nómina Empresarial - Nomina MX**

### 1.2 Versión
2.0.0

### 1.3 Propósito
Sistema integral de gestión de nómina empresarial diseñado para cumplir con las normativas mexicanas (IMSS, ISSSTE, SAT, INFONAVIT). Permite la administración completa del ciclo de nómina, desde la gestión de empleados hasta la generación de recibos CFDI 4.0 con complemento de nómina 1.2.

---

## 2. Arquitectura del Sistema

### 2.1 Arquitectura General (Tres Capas)

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
│    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│    │Attend.  │ │Vacation │ │Benefits │ │Incidents│         │
│    │ Module  │ │ Module  │ │ Module  │ │ Module  │         │
│    └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CAPA DE DATOS                           │
│         (PostgreSQL + Prisma ORM + Redis + Storage)          │
│    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│    │  Users  │ │Employees│ │ Payroll │ │Companies│         │
│    │  Table  │ │  Table  │ │ Tables  │ │  Table  │         │
│    └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Arquitectura Multi-Tenant

El sistema implementa un modelo **Shared Database** con aislamiento lógico:

```
┌───────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Shared DB)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│  │ Company A   │ │ Company B   │ │ Company C   │             │
│  │ companyId=1 │ │ companyId=2 │ │ companyId=3 │             │
│  │             │ │             │ │             │             │
│  │ employees   │ │ employees   │ │ employees   │             │
│  │ payrolls    │ │ payrolls    │ │ payrolls    │             │
│  │ attendance  │ │ attendance  │ │ attendance  │             │
│  └─────────────┘ └─────────────┘ └─────────────┘             │
└───────────────────────────────────────────────────────────────┘
```

**Flujo de Aislamiento:**
```
1. HTTP Request → JwtAuthGuard → Extrae companyId del token
2. TenantMiddleware → Crea TenantContext en AsyncLocalStorage
3. CompanyGuard → Valida acceso a la empresa
4. Controller → Recibe @CurrentUser() decorator
5. Prisma Middleware → Inyecta automáticamente WHERE companyId = ?
6. PostgreSQL → Retorna solo datos de la empresa
```

### 2.3 Stack Tecnológico

#### Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.2.x | Framework UI |
| TypeScript | 5.x | Tipado estático |
| Vite | 5.x | Build tool y dev server |
| TailwindCSS | 3.x | Framework CSS utility-first |
| TanStack React Query | 5.x | Estado del servidor y caché |
| TanStack React Table | 8.x | Tablas avanzadas |
| React Router | 6.x | Enrutamiento SPA |
| React Hook Form | 7.x | Manejo de formularios |
| Zod | 3.x | Validación de esquemas |
| Recharts | 2.x | Gráficas y visualizaciones |
| i18next | 25.x | Internacionalización |
| Axios | 1.x | Cliente HTTP |
| Headless UI | 2.x | Componentes accesibles |
| dnd-kit | 6.x | Drag and drop |

#### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 20.x | Runtime |
| NestJS | 10.x | Framework backend modular |
| TypeScript | 5.x | Tipado estático |
| Prisma | 5.x | ORM con migraciones |
| PostgreSQL | 16.x | Base de datos relacional |
| Redis | 7.x | Colas y caché |
| BullMQ | 5.x | Colas de trabajos |
| JWT/Passport | - | Autenticación |
| bcrypt | - | Cifrado de contraseñas |
| class-validator | - | Validación de DTOs |
| class-transformer | - | Transformación de datos |
| ExcelJS | 4.x | Generación de reportes Excel |
| PDFKit | - | Generación de PDF |
| xml2js | - | Procesamiento XML CFDI |
| nestjs-i18n | - | Internacionalización |
| Helmet | - | Headers de seguridad |

#### Infraestructura
| Tecnología | Propósito |
|------------|-----------|
| Docker 24+ | Contenedorización |
| Docker Compose 2.x | Orquestación local |
| Nginx | Proxy reverso, SSL, servidor frontend |
| Redis | Colas de procesamiento (BullMQ) |
| n8n | Automatización y workflows |

---

## 3. Estructura del Proyecto

### 3.1 Estructura General

```
nomina/
├── backend/                          # API NestJS
│   ├── prisma/
│   │   ├── schema.prisma            # Esquema de BD (60+ modelos)
│   │   ├── migrations/              # 18+ migraciones
│   │   └── seed.ts                  # Datos iniciales
│   ├── src/
│   │   ├── common/
│   │   │   ├── ai-providers/        # Proveedores IA (Claude, GPT, Gemini)
│   │   │   ├── constants/           # Constantes del sistema
│   │   │   ├── decorators/          # @CurrentUser, @Roles, etc.
│   │   │   ├── exceptions/          # Excepciones personalizadas
│   │   │   ├── filters/             # Filtros de excepciones
│   │   │   ├── fiscal/              # Cálculos ISR, IMSS
│   │   │   ├── formulas/            # Motor de fórmulas
│   │   │   ├── government/          # Integraciones gubernamentales
│   │   │   ├── guards/              # JwtAuthGuard, RolesGuard
│   │   │   ├── health/              # Health checks
│   │   │   ├── middleware/          # TenantMiddleware
│   │   │   ├── prisma/              # PrismaService
│   │   │   ├── queues/              # Configuración BullMQ
│   │   │   ├── security/            # Cifrado, hashing
│   │   │   ├── tenant/              # TenantContextService
│   │   │   └── utils/               # Utilidades
│   │   ├── modules/                 # 29+ módulos de negocio
│   │   │   ├── auth/                # Autenticación, MFA, SSO
│   │   │   ├── users/               # Gestión de usuarios
│   │   │   ├── employees/           # Gestión de empleados
│   │   │   ├── departments/         # Departamentos
│   │   │   ├── payroll/             # Cálculo de nómina
│   │   │   ├── cfdi/                # Generación CFDI
│   │   │   ├── attendance/          # Control de asistencia
│   │   │   ├── vacations/           # Vacaciones y permisos
│   │   │   ├── benefits/            # Prestaciones
│   │   │   ├── incidents/           # Incidencias
│   │   │   ├── reports/             # Reportes
│   │   │   ├── catalogs/            # Catálogos SAT
│   │   │   ├── devices/             # Dispositivos biométricos
│   │   │   ├── whatsapp/            # Integración WhatsApp
│   │   │   ├── notifications/       # Sistema notificaciones
│   │   │   └── ...                  # Otros módulos
│   │   ├── i18n/                    # Traducciones
│   │   │   ├── es-MX/               # Español México
│   │   │   └── en-US/               # Inglés
│   │   ├── app.module.ts            # Módulo principal
│   │   ├── main.ts                  # Punto de entrada API
│   │   └── worker.ts                # Punto de entrada Worker
│   ├── Dockerfile                   # Producción
│   ├── Dockerfile.dev               # Desarrollo
│   └── docker-entrypoint.sh         # Script de inicio
│
├── frontend/                        # React + Vite
│   ├── src/
│   │   ├── components/              # Componentes reutilizables
│   │   │   ├── Layout.tsx           # Layout principal
│   │   │   ├── guards/              # ProtectedRoute, RoleGuard
│   │   │   ├── payroll/             # Componentes de nómina
│   │   │   └── settings/            # Configuración
│   │   ├── contexts/                # Contextos React
│   │   │   ├── AuthContext.tsx      # Autenticación
│   │   │   ├── ThemeContext.tsx     # Tema oscuro/claro
│   │   │   └── SystemConfigContext.tsx
│   │   ├── pages/                   # Vistas/Pantallas
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EmployeesPage.tsx
│   │   │   ├── PayrollPage.tsx
│   │   │   ├── AttendancePage.tsx
│   │   │   ├── portal/              # Portal empleado
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── api.ts               # Cliente Axios
│   │   ├── hooks/                   # Hooks personalizados
│   │   ├── lib/                     # Librerías helper
│   │   ├── types/                   # Tipos TypeScript
│   │   ├── i18n/                    # Configuración i18n
│   │   │   └── locales/             # Traducciones
│   │   └── utils/                   # Utilidades
│   ├── Dockerfile                   # Producción (Nginx)
│   ├── Dockerfile.dev               # Desarrollo (Vite)
│   └── nginx.conf                   # Configuración Nginx
│
├── docs/                            # Documentación (19 archivos)
├── nginx/                           # Configuraciones Nginx
│   ├── staging.conf
│   ├── production.conf
│   └── ssl/                         # Certificados
├── scripts/                         # Scripts auxiliares
├── storage/                         # Evidencias fiscales
├── n8n-workflows/                   # Workflows de automatización
│
├── docker-compose.yml               # Base
├── docker-compose.dev.yml           # Desarrollo
├── docker-compose.staging.yml       # Staging
├── docker-compose.production.yml    # Producción
├── docker-compose.n8n.yml           # n8n separado
│
├── deploy-fresh.sh                  # Deploy desarrollo
├── deploy-staging.sh                # Deploy staging
├── deploy-production.sh             # Deploy producción
├── Makefile                         # Comandos útiles
│
├── .env.example                     # Variables desarrollo
├── .env.staging.example             # Variables staging
└── .env.production.example          # Variables producción
```

---

## 4. Módulos del Backend (29+)

### 4.1 Módulos Principales

| Módulo | Descripción | Endpoints Principales |
|--------|-------------|----------------------|
| **auth** | Autenticación, MFA, SSO Azure AD | `/auth/login`, `/auth/register`, `/auth/refresh` |
| **users** | Gestión de usuarios del sistema | `/users`, `/users/:id` |
| **employees** | CRUD empleados, documentos, historial | `/employees`, `/employees/:id/documents` |
| **departments** | Estructura organizacional | `/departments`, `/departments/hierarchy` |
| **hierarchy** | Jerarquía y aprobadores | `/hierarchy`, `/hierarchy/approvers` |
| **payroll** | Cálculo nómina, percepciones, deducciones | `/payroll/periods`, `/payroll/calculate` |
| **cfdi** | Generación XML, timbrado PAC | `/cfdi/generate`, `/cfdi/stamp` |
| **attendance** | Check-in/out, retardos, faltas | `/attendance`, `/attendance/check-in` |
| **vacations** | Solicitudes y aprobaciones | `/vacations`, `/vacations/request` |
| **benefits** | Vales, bonos, prestaciones | `/benefits`, `/employee-benefits` |
| **incidents** | Faltas, retardos, permisos | `/incidents`, `/incident-types` |

### 4.2 Módulos de Soporte

| Módulo | Descripción |
|--------|-------------|
| **system-config** | Configuración global del sistema |
| **system-modules** | Módulos activables por empresa |
| **catalogs** | Catálogos SAT (bancos, contratos, etc.) |
| **reports** | Generación reportes Excel/PDF |
| **devices** | Dispositivos biométricos |
| **roles** | RBAC (Role-Based Access Control) |
| **portal** | Portal del empleado |
| **accounting-config** | Configuración contable |

### 4.3 Módulos de Integración

| Módulo | Descripción |
|--------|-------------|
| **whatsapp** | Integración WhatsApp Business (Twilio) |
| **n8n** | Integración con n8n (workflows) |
| **notifications** | Sistema de notificaciones |
| **email** | Envío de emails (SMTP) |
| **pac** | Integración con PAC (Finkok, etc.) |
| **government** | IMSS, INFONAVIT, ISSSTE |

---

## 5. Modelo de Datos

### 5.1 Entidades Principales

#### Usuario (User)
```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  password        String?
  firstName       String
  lastName        String
  isActive        Boolean   @default(true)
  roleId          String
  role            Role      @relation(...)
  companyId       String?
  company         Company?  @relation(...)
  authProvider    AuthProvider @default(LOCAL)
  mfaEnabled      Boolean   @default(false)
  mfaSecret       String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

#### Empleado (Employee)
```prisma
model Employee {
  id              String          @id @default(uuid())
  employeeNumber  String
  firstName       String
  lastName        String
  email           String?
  curp            String
  rfc             String
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
  bankAccount     String?         // Cifrado
  clabe           String?         // Cifrado
  photoUrl        String?
  isActive        Boolean         @default(true)

  // Relaciones
  company         Company
  department      Department
  position        JobPosition
  payrolls        PayrollDetail[]
  attendances     AttendanceRecord[]
  incidents       EmployeeIncident[]
  documents       EmployeeDocument[]
  salaryHistory   SalaryHistory[]
}
```

#### Nómina (PayrollPeriod / PayrollDetail)
```prisma
model PayrollPeriod {
  id              String          @id @default(uuid())
  companyId       String
  periodType      PeriodType      // WEEKLY, BIWEEKLY, MONTHLY
  periodNumber    Int
  year            Int
  startDate       DateTime
  endDate         DateTime
  paymentDate     DateTime?
  status          PeriodStatus    // DRAFT, CALCULATED, APPROVED, STAMPED

  details         PayrollDetail[]
  rulesetSnapshot Json?           // Snapshot de reglas fiscales
}

model PayrollDetail {
  id              String          @id @default(uuid())
  periodId        String
  employeeId      String
  baseSalary      Decimal
  workedDays      Decimal
  totalEarnings   Decimal
  totalDeductions Decimal
  netPay          Decimal
  status          DetailStatus

  // CFDI
  cfdiUuid        String?
  cfdiXml         String?
  cfdiPdf         String?
  stampedAt       DateTime?

  perceptions     PayrollPerception[]
  deductions      PayrollDeduction[]
}
```

### 5.2 Diagrama Entidad-Relación (Simplificado)

```
                              ┌─────────────┐
                              │   Company   │
                              └──────┬──────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
       ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
       │    User     │        │  Employee   │        │ Department  │
       └──────┬──────┘        └──────┬──────┘        └─────────────┘
              │                      │
              │                      │
              │         ┌────────────┼────────────┐
              │         ▼            ▼            ▼
              │  ┌─────────────┐┌─────────┐┌─────────────┐
              │  │PayrollDetail││Attendance││ Incidents  │
              │  └──────┬──────┘└──────────┘└─────────────┘
              │         │
              │         │
              │    ┌────┴────┐
              │    ▼         ▼
              │┌───────┐┌──────────┐
              ││ CFDI  ││Perceptions│
              │└───────┘│Deductions │
              │         └──────────┘
              ▼
       ┌─────────────┐
       │  AuditLog   │
       │(Tamper-Evid)│
       └─────────────┘
```

### 5.3 Modelos de Seguridad

```prisma
// Auditoría Tamper-Evident
model AuditLog {
  id                String    @id @default(uuid())
  entityType        String
  entityId          String
  action            String    // CREATE, UPDATE, DELETE
  oldValues         Json?
  newValues         Json?
  userId            String
  companyId         String?
  ipAddress         String?
  userAgent         String?

  // Tamper-evident fields
  entryHash         String    // SHA-256 de la entrada
  previousEntryHash String?   // Hash encadenado
  sequenceNumber    Int       // Número secuencial
  isCriticalAction  Boolean   @default(false)
  legalBasis        String?   // Base legal

  createdAt         DateTime  @default(now())
}

// Control Dual (Maker-Checker)
model DualControlRequest {
  id                String    @id @default(uuid())
  requestType       String    // PAYROLL_APPROVAL, STAMP_AUTHORIZATION
  entityType        String
  entityId          String
  requestedById     String
  approvedById      String?
  status            DualControlStatus // PENDING, APPROVED, REJECTED
  requestData       Json?
  approvalData      Json?
  createdAt         DateTime  @default(now())
  approvedAt        DateTime?
}

// Configuración MFA
model MfaConfig {
  id                String    @id @default(uuid())
  userId            String    @unique
  method            MfaMethod // TOTP, EMAIL
  secret            String?   // Cifrado
  backupCodes       String[]  // Cifrados
  isVerified        Boolean   @default(false)
  createdAt         DateTime  @default(now())
}
```

---

## 6. APIs y Endpoints

### 6.1 Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/register` | Registrar usuario |
| POST | `/auth/refresh` | Renovar token |
| GET | `/auth/profile` | Obtener perfil actual |
| POST | `/auth/mfa/setup` | Configurar MFA |
| POST | `/auth/mfa/verify` | Verificar código MFA |
| GET | `/auth/microsoft/login` | Login con Microsoft SSO |

### 6.2 Empleados
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/employees` | Listar empleados (paginado) |
| GET | `/employees/:id` | Obtener empleado |
| POST | `/employees` | Crear empleado |
| PATCH | `/employees/:id` | Actualizar empleado |
| DELETE | `/employees/:id` | Eliminar empleado |
| GET | `/employees/:id/documents` | Documentos del empleado |
| POST | `/employees/:id/documents` | Subir documento |
| GET | `/employees/:id/salary-history` | Historial salarial |

### 6.3 Nómina
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/payroll/periods` | Listar periodos |
| POST | `/payroll/periods` | Crear periodo |
| GET | `/payroll/periods/:id` | Obtener periodo con detalles |
| POST | `/payroll/periods/:id/calculate` | Calcular nómina |
| POST | `/payroll/periods/:id/approve` | Aprobar y timbrar |
| GET | `/payroll/periods/:id/stamping-status` | Estado de timbrado |
| GET | `/payroll/receipts/:id` | Obtener recibo |
| GET | `/payroll/receipts/:id/pdf` | Descargar PDF |
| GET | `/payroll/receipts/:id/xml` | Descargar XML |

### 6.4 CFDI
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/cfdi/generate` | Generar XML |
| POST | `/cfdi/stamp` | Timbrar con PAC |
| POST | `/cfdi/cancel` | Cancelar CFDI |
| GET | `/cfdi/:uuid/status` | Estado del CFDI |

### 6.5 Asistencia
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/attendance` | Registros de asistencia |
| POST | `/attendance/check-in` | Registrar entrada |
| POST | `/attendance/check-out` | Registrar salida |
| GET | `/attendance/report` | Reporte de asistencia |

### 6.6 Health Check
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Estado del sistema |
| GET | `/api/health/db` | Estado de la BD |
| GET | `/api/health/redis` | Estado de Redis |

---

## 7. Seguridad

### 7.1 Autenticación
- **JWT** con expiración configurable (default: 24h)
- **Refresh tokens** para sesiones prolongadas
- **MFA** opcional (TOTP, Email)
- **SSO** con Microsoft Azure AD
- **Passwords** hasheados con bcrypt (salt rounds: 12)

### 7.2 Autorización (RBAC)
| Rol | Permisos |
|-----|----------|
| `admin` | Acceso total al sistema |
| `company_admin` | Administrador de empresa |
| `rh` | Recursos Humanos (nómina, empleados) |
| `manager` | Gerente (aprobaciones, reportes) |
| `employee` | Portal de autoservicio |

### 7.3 Protección de Datos
- **HTTPS** obligatorio en producción
- **Cifrado AES-256** para datos sensibles (RFC, CURP, cuentas bancarias)
- **Sanitización** de inputs
- **Validación** estricta de DTOs con class-validator
- **Prepared statements** (Prisma ORM)
- **Rate limiting** en endpoints críticos
- **Helmet** para headers de seguridad

### 7.4 Auditoría Tamper-Evident
- Hash SHA-256 de cada entrada
- Hash encadenado (blockchain-style)
- Número de secuencia
- Registro de acciones críticas
- Base legal para operaciones fiscales

### 7.5 Control Dual (Maker-Checker)
- Separación entre quien calcula y quien autoriza timbrado
- Flujo de aprobación configurable
- Registro completo de autorizaciones

---

## 8. Procesamiento Asíncrono

### 8.1 Arquitectura de Colas (BullMQ)

```
┌─────────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Backend API   │────▶│    Redis    │────▶│ StampingWorker  │
│  (QUEUE_MODE:   │     │  (BullMQ)   │     │ (QUEUE_MODE:    │
│      api)       │     │             │     │    worker)      │
└─────────────────┘     └─────────────┘     └─────────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────┐
                                            │   PAC (SAT) │
                                            │   FINKOK    │
                                            └─────────────┘
```

### 8.2 Modos de Operación (QUEUE_MODE)

| Modo | Descripción | Uso |
|------|-------------|-----|
| `api` | Solo API (encola jobs, no procesa) | Backend en producción |
| `worker` | Solo Worker (procesa jobs, no API) | Workers dedicados |
| `both` | API + Worker en mismo proceso | Desarrollo |
| `sync` | Sin colas (todo síncrono) | Desarrollo local |

### 8.3 Colas Disponibles

| Cola | Descripción |
|------|-------------|
| `cfdi-stamping` | Timbrado de CFDIs |
| `payroll-calculation` | Cálculo de nómina |
| `notifications` | Envío de notificaciones |
| `email` | Envío de correos |
| `reports` | Generación de reportes |

---

## 9. Integraciones

### 9.1 SAT - CFDI 4.0
- Generación de XML según esquema del SAT
- Complemento de Nómina 1.2
- Timbrado mediante PAC autorizado (Finkok, etc.)
- Catálogos actualizados del SAT
- Cancelación de CFDIs

### 9.2 IMSS
- Cálculo de cuotas obrero-patronales
- Generación de reportes SUA
- Movimientos IDSE (altas, bajas, modificaciones)

### 9.3 INFONAVIT
- Descuentos automáticos por crédito
- Tipos de descuento (%, fijo, VSM)
- Generación de reportes

### 9.4 Dispositivos Biométricos
| Marca | Protocolo | Puerto |
|-------|-----------|--------|
| ZKTECO | TCP/IP, HTTP | 4370 |
| ANVIZ | HTTP | 80 |
| Suprema | HTTP | 80 |
| Genérico | HTTP Webhook | - |

### 9.5 WhatsApp + n8n + ChatBot IA
- Recepción de mensajes via Twilio
- Procesamiento con n8n workflows
- ChatBot IA (Claude, GPT-4, Gemini)
- Notificaciones automáticas

---

## 10. Performance y Escalabilidad

### 10.1 Optimizaciones
- Lazy loading de módulos en frontend
- Paginación en listados
- Índices en base de datos
- Caché con React Query (5 min stale time)
- Compresión gzip en Nginx
- Connection pooling en PostgreSQL
- Rate limiting por endpoint

### 10.2 Límites Recomendados
| Recurso | Límite |
|---------|--------|
| Empleados por empresa | 10,000 |
| Registros por consulta | 1,000 |
| Tamaño máximo de archivo | 10 MB |
| Workers concurrentes | 5 por instancia |
| Conexiones DB | 20 pool |

### 10.3 Escalamiento Horizontal

```
                    ┌─────────────┐
                    │   Nginx     │
                    │   (LB)      │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  Backend 1  │ │  Backend 2  │ │  Backend 3  │
    │ QUEUE_MODE  │ │ QUEUE_MODE  │ │ QUEUE_MODE  │
    │   =api      │ │   =api      │ │   =api      │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │   Worker 1  │ │   Worker 2  │ │   Worker 3  │
    └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 11. Mantenimiento

### 11.1 Logs
- Logs de aplicación estructurados (JSON)
- Logs de acceso HTTP (Nginx)
- Logs de auditoría para acciones críticas
- Rotación automática

### 11.2 Backups
- Backup diario de PostgreSQL
- Backup de evidencias fiscales (5 años SAT)
- Backup de certificados digitales
- Retención mínima: 30 días DB, 5 años fiscal

### 11.3 Monitoreo
- Health checks en `/api/health`
- Métricas de colas (BullMQ)
- Alertas de errores críticos
- Monitoreo de espacio en disco

---

## 12. Cumplimiento Normativo

### 12.1 Normativas Fiscales
- CFDI 4.0 (Comprobante Fiscal Digital por Internet)
- Complemento de Nómina 1.2
- Catálogos SAT actualizados 2024

### 12.2 Normativas Laborales
- Ley Federal del Trabajo
- Ley del Seguro Social
- Ley del INFONAVIT
- Ley del ISR (Tablas 2024)
- Ley del ISSSTE

### 12.3 Protección de Datos
- Ley Federal de Protección de Datos Personales
- Cifrado de datos sensibles
- Consentimiento informado
- Derecho de acceso/rectificación

---

## 13. Glosario

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
| CSD | Certificado de Sello Digital |
| RBAC | Role-Based Access Control |
| MFA | Multi-Factor Authentication |
| JWT | JSON Web Token |
| SSO | Single Sign-On |
| BullMQ | Librería de colas para Node.js/Redis |

---

*Documento generado: Enero 2025*
*Versión del documento: 2.0*
