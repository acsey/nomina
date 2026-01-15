# Análisis de Arquitectura Multi-Tenant para SaaS

**Fecha**: Enero 2026
**Sistema**: Sistema de Nómina México
**Estado**: Análisis - NO IMPLEMENTAR

---

## 1. MODELO ACTUAL

### 1.1 Arquitectura de Aislamiento

El sistema usa **aislamiento lógico** con una base de datos compartida:

```
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                            │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Tabla employees                                     ││
│  │  ┌──────────┬───────────┬───────────┬─────────────┐ ││
│  │  │ id       │ name      │ company_id │ salary      │ ││
│  │  ├──────────┼───────────┼───────────┼─────────────┤ ││
│  │  │ emp_001  │ Juan      │ ACME_001   │ 15000       │ ││
│  │  │ emp_002  │ María     │ TECH_002   │ 22000       │ ││
│  │  │ emp_003  │ Pedro     │ ACME_001   │ 18000       │ ││
│  │  └──────────┴───────────┴───────────┴─────────────┘ ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 1.2 Mecanismos de Protección Existentes

#### A) CompanyGuard (Guards de Controlador)
- **Ubicación**: `src/modules/auth/guards/company.guard.ts`
- **Alcance**: Valida `companyId` en URL params, query, body
- **Limitación**: Validación post-fetch (primero obtiene, luego valida)

#### B) TenantIsolationMiddleware (Prisma Middleware)
- **Ubicación**: `src/common/tenant/tenant-isolation.middleware.ts`
- **Alcance**: Intercepta queries Prisma, agrega filtro `companyId`
- **Modo actual**: `strict=false` (solo warnings, no bloquea)
- **Limitación**: No intercepta `$queryRaw`, `$executeRaw`

#### C) TenantContextService (AsyncLocalStorage)
- **Ubicación**: `src/common/tenant/tenant-context.service.ts`
- **Alcance**: Propaga contexto de tenant en request/job
- **Estado**: Implementado pero no activado globalmente

### 1.3 Modelos con `companyId` Directo

| Modelo | companyId | Índice | Estado |
|--------|-----------|--------|--------|
| Employee | ✓ Requerido | ✓ | OK |
| Department | ✓ Requerido | - | Falta índice |
| PayrollPeriod | ✓ Requerido | ✓ Unique | OK |
| PayrollDetail | Indirecto | - | Via payrollPeriod |
| CfdiNomina | Indirecto | - | Via employee |
| Notification | ✓ Opcional | ✓ | OK |
| BiometricDevice | ✓ Requerido | - | Falta índice |
| CompanyPayrollConfig | ✓ Unique | ✓ | OK |
| FiscalRule | ✓ Requerido | ✓ | OK |

### 1.4 Modelos Globales (Sin companyId)

| Modelo | Justificación | Riesgo |
|--------|---------------|--------|
| User | Super admin sin empresa | Bajo - tiene companyId opcional |
| Role | Roles del sistema | Bajo - son globales por diseño |
| JobPosition | **PROBLEMA**: Debería ser por empresa | **ALTO** |
| Bank | Catálogo SAT | Ninguno |
| ImssRate | Tasas gobierno | Ninguno |
| IsrTable | Tablas SAT | Ninguno |
| PacProvider | Catálogo PACs | Ninguno |
| WorkSchedule | **REVISAR**: ¿Tiene companyId? | Medio |

---

## 2. RIESGOS IDENTIFICADOS

### 2.1 CRÍTICO: JobPosition sin companyId

```prisma
model JobPosition {
  id          String   @id @default(uuid())
  name        String   // "Contador", "Gerente"
  // ❌ NO tiene companyId
}
```

**Impacto**: Todos los puestos son globales. Una empresa puede ver/usar puestos de otra.

**Escenario de fuga**:
1. Empresa A crea puesto "Director Comercial $150k-$200k"
2. Empresa B ve el puesto con rangos salariales

### 2.2 ALTO: Validación Post-Fetch

Patrón actual en controladores:
```typescript
async findOne(@Param('id') id: string) {
  const employee = await this.service.findOne(id); // ❌ Fetch sin filtro
  this.validateAccess(user, employee.companyId);    // Validación después
  return employee;
}
```

**Impacto**:
- Información leak en errores
- Side-channel timing attacks
- Log pollution con datos de otras empresas

### 2.3 MEDIO: Raw Queries sin Filtro

```typescript
// Ejemplo potencial de riesgo
const result = await prisma.$queryRaw`
  SELECT * FROM employees WHERE salary > 50000
`; // ❌ Sin filtro companyId
```

**Queries raw identificadas**:
- Health check (`SELECT 1`)
- Algunas migraciones manuales

### 2.4 MEDIO: Tenant Middleware en Modo Warning

```typescript
const { strict = false } = options; // Actualmente: soft enforcement
```

**Impacto**: Errores de aislamiento se registran pero no bloquean.

### 2.5 BAJO: Índices Faltantes

Modelos sin índice en `companyId`:
- Department
- BiometricDevice
- Holiday
- WorkSchedule

**Impacto**: Performance en queries multi-tenant, no seguridad directa.

---

## 3. OPCIONES DE ARQUITECTURA

### OPCIÓN A: Single DB + Tenant Reforzado (Recomendada)

```
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                            │
│                                                          │
│   RLS (Row Level Security) + Middleware Estricto        │
│   ┌───────────────────────────────────────────────────┐ │
│   │  SET app.current_tenant = 'ACME_001'              │ │
│   │  CREATE POLICY tenant_isolation ON employees       │ │
│   │    USING (company_id = current_setting('...'))    │ │
│   └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Cambios Requeridos:

1. **Activar modo estricto en TenantIsolationMiddleware**
   - Cambiar `strict: false` → `strict: true`
   - Agregar handling de errores

2. **Agregar companyId a JobPosition**
   - Migración para agregar columna
   - Migración de datos existentes

3. **Validación Pre-Fetch en controladores**
   ```typescript
   // Cambiar de:
   const entity = await service.findOne(id);
   validateAccess(entity.companyId);

   // A:
   const entity = await service.findOneForCompany(id, user.companyId);
   ```

4. **Índices compuestos**
   ```sql
   CREATE INDEX idx_employees_company ON employees(company_id);
   CREATE INDEX idx_departments_company ON departments(company_id);
   ```

5. **Opcional: PostgreSQL RLS**
   - Capa adicional a nivel DB
   - Protege incluso contra bugs en código

#### Pros:
- ✅ Menor complejidad operativa
- ✅ Migraciones simples (schema unificado)
- ✅ Backups simples
- ✅ Queries cross-tenant posibles para super-admin
- ✅ Costo bajo (una DB)

#### Contras:
- ❌ Riesgo residual de SQL injection
- ❌ Más difícil cumplir con "data residency"
- ❌ Un bug puede afectar todos los tenants
- ❌ Noisy neighbor (un tenant pesado afecta otros)

#### Costo Estimado: **Bajo-Medio**
- 2-3 días para JobPosition fix
- 1-2 días para modo estricto
- 1 día para índices
- Testing: 3-5 días

---

### OPCIÓN B: Database per Tenant

```
┌─────────────────────────────────────────────────────────┐
│  Connection Router                                       │
│  ┌─────────────────────────────────────────────────────┐│
│  │  tenant_connections: Map<tenantId, PrismaClient>    ││
│  └─────────────────────────────────────────────────────┘│
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
    ┌──────▼──────┐        ┌──────▼──────┐
    │ nomina_acme │        │ nomina_tech │
    │ PostgreSQL  │        │ PostgreSQL  │
    └─────────────┘        └─────────────┘
```

#### Cambios Requeridos:

1. **Connection Factory dinámico**
   ```typescript
   // Ya existe estructura base en:
   // src/common/tenant/prisma-connection.factory.ts
   ```

2. **Migraciones automatizadas**
   - Script para crear DB nueva por tenant
   - Aplicar schema a todas las DBs

3. **Provisioning de nuevos clientes**
   - API para crear tenant
   - Crear DB + aplicar migraciones
   - Configurar credenciales en vault

4. **Backups por tenant**
   - pg_dump individual
   - Restore granular posible

#### Pros:
- ✅ Aislamiento total garantizado
- ✅ Cumplimiento data residency trivial
- ✅ Performance predecible por tenant
- ✅ Backup/restore granular
- ✅ Escalar tenants grandes independientemente

#### Contras:
- ❌ Complejidad operativa alta
- ❌ Migraciones N veces más lentas
- ❌ Costo de infraestructura alto
- ❌ Connection pooling complejo
- ❌ Monitoreo más difícil
- ❌ Cross-tenant queries imposibles

#### Costo Estimado: **Alto**
- 2-3 semanas para connection routing
- 1 semana para provisioning automation
- 2 semanas para migración de datos
- Testing: 2 semanas
- **Costo mensual**: +$50-200/tenant en infra

---

### OPCIÓN C: Híbrido (Datos Fiscales Separados)

```
┌─────────────────────────────────────────────────────────┐
│  DB Operativa (Compartida)                               │
│  - employees, departments, attendance, etc.             │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  DBs Fiscales (Por Tenant)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ fiscal_acme │  │ fiscal_tech │  │ fiscal_xyz  │      │
│  │ - cfdi      │  │ - cfdi      │  │ - cfdi      │      │
│  │ - payroll   │  │ - payroll   │  │ - payroll   │      │
│  │ - stamping  │  │ - stamping  │  │ - stamping  │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────┘
```

#### Justificación Legal:
- CFDIs son documentos legales con requisitos de custodia
- NOM-151-SCFI-2016 requiere conservación 5 años
- Auditorías SAT requieren trazabilidad por RFC emisor

#### Datos en DB Fiscal (por tenant):
- CfdiNomina
- StampingAttempt
- PayrollDetail
- PayrollPerception
- PayrollDeduction
- FiscalCalculationAudit

#### Datos en DB Operativa (compartida):
- Employee (referencia, no fiscal)
- Department
- Attendance
- VacationRequest
- User, Role

#### Pros:
- ✅ Balance seguridad/complejidad
- ✅ Datos fiscales aislados (legal)
- ✅ Datos operativos eficientes
- ✅ Backup fiscal por empresa
- ✅ Puede cumplir auditorías por tenant

#### Contras:
- ❌ Transacciones cross-DB complejas
- ❌ Joins entre DBs imposibles
- ❌ Lógica de routing dual
- ❌ Sincronización employee ↔ fiscal

#### Costo Estimado: **Medio-Alto**
- 3-4 semanas implementación
- Testing: 2 semanas
- **Costo mensual**: +$20-50/tenant

---

## 4. RECOMENDACIÓN FINAL

### **OPCIÓN A: Single DB + Tenant Reforzado**

#### Justificación:

| Criterio | Opción A | Opción B | Opción C |
|----------|----------|----------|----------|
| Seguridad | ★★★★☆ | ★★★★★ | ★★★★☆ |
| Escalabilidad | ★★★★☆ | ★★★★★ | ★★★★☆ |
| Costo Operativo | ★★★★★ | ★★☆☆☆ | ★★★☆☆ |
| Tiempo Implementación | ★★★★★ | ★★☆☆☆ | ★★★☆☆ |
| Complejidad | ★★★★★ | ★★☆☆☆ | ★★★☆☆ |

#### Razones:

1. **El sistema ya tiene 90% de la infraestructura**
   - TenantContextService implementado
   - TenantIsolationMiddleware implementado
   - CompanyGuard implementado
   - Solo falta activar y reforzar

2. **El riesgo identificado es corregible**
   - JobPosition: 1 migración
   - Modo estricto: 1 cambio de configuración
   - Validación pre-fetch: Refactor gradual

3. **Costo-beneficio favorable**
   - Opción B requiere 10x más tiempo
   - Opción B tiene costo mensual recurrente alto
   - Para <100 empresas, single DB es más práctico

4. **Path a Opción B si se necesita**
   - La arquitectura actual permite migrar a DB-per-tenant
   - PrismaConnectionFactory ya tiene el diseño
   - Puede hacerse para tenants enterprise específicos

#### Plan de Acción Sugerido:

```
Fase 1 (P0 - Inmediato):
├── Agregar companyId a JobPosition
├── Activar modo strict en TenantIsolationMiddleware
└── Agregar índices faltantes

Fase 2 (P1 - Corto Plazo):
├── Refactor controladores a validación pre-fetch
├── Agregar tests de aislamiento
└── Audit de raw queries

Fase 3 (P2 - Opcional):
├── Implementar PostgreSQL RLS
├── Agregar rate limiting por tenant
└── Monitoreo de queries cross-tenant
```

---

## 5. MATRIZ DE IMPACTO

### Si se elige Opción A:

| Área | Impacto | Archivos Afectados |
|------|---------|-------------------|
| Schema | Bajo | `prisma/schema.prisma` (1 modelo) |
| Migraciones | Bajo | 1-2 migraciones |
| Guards | Ninguno | Ya implementado |
| Middleware | Bajo | Cambiar 1 flag |
| Controllers | Medio | ~15 controladores (gradual) |
| Services | Bajo | ~5 servicios |
| Tests | Medio | Agregar tests de aislamiento |

### Riesgos de NO actuar:

| Escenario | Probabilidad | Impacto | Riesgo |
|-----------|--------------|---------|--------|
| Fuga de datos entre empresas | Media | Crítico | **ALTO** |
| Incumplimiento normativo | Baja | Alto | Medio |
| Incidente de seguridad | Media | Crítico | **ALTO** |
| Pérdida de cliente por audit fallida | Media | Alto | **ALTO** |

---

## 6. CONCLUSIÓN

**Recomendación**: Implementar **Opción A** con prioridad P0.

El sistema tiene una base sólida de multi-tenancy. Los riesgos identificados son:
1. **Corregibles** con cambios menores
2. **Localizados** (principalmente JobPosition y modo estricto)
3. **No requieren** rediseño arquitectónico

El costo de pasar a DB-per-tenant no se justifica para el volumen esperado de clientes (<100 empresas inicialmente). Si un cliente enterprise requiere aislamiento total, se puede ofrecer como premium con Opción B específica para ellos.

---

**Documento de análisis - No implementar sin aprobación**
