# Mejoras Enterprise para Sistema de Nómina Mexicana

## Resumen Ejecutivo

Este documento describe las mejoras enterprise implementadas para el sistema de nómina mexicana, enfocadas en:

1. **Reproducibilidad fiscal**: Snapshots de reglas por recibo
2. **Separación de responsabilidades**: Flujo de autorización de timbrado
3. **Seguridad granular**: Sistema RBAC completo
4. **Confiabilidad**: Idempotencia y concurrencia blindada
5. **Integridad documental**: Evidencias fiscales con SHA256
6. **Experiencia de usuario**: Nuevos componentes frontend

---

## 1. Snapshots de Reglas de Cálculo

### Problema Resuelto
Antes, si las fórmulas de cálculo, valores UMA/SMG o tablas ISR cambiaban, no era posible reproducir exactamente cómo se calculó un recibo histórico.

### Solución Implementada

**Modelo: `ReceiptRulesetSnapshot`**

```prisma
model ReceiptRulesetSnapshot {
  id                String   @id @default(uuid())
  payrollDetailId   String
  version           Int      @default(1)

  // Fórmulas usadas
  formulasUsed      Json     @default("[]")

  // Valores fiscales
  umaDaily          Decimal
  umaMonthly        Decimal
  smgDaily          Decimal
  smgZfnDaily       Decimal?

  // Configuración
  roundingMode      String   @default("HALF_UP")
  decimalScale      Int      @default(2)

  // Tablas usadas
  isrTableVersion     String?
  subsidioTableVersion String?
  imssRatesVersion    String?

  fiscalYear        Int
  periodType        String
  calculationParams Json     @default("{}")
}
```

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/payroll/receipts/:id/ruleset-snapshot` | Snapshot más reciente |
| GET | `/payroll/receipts/:id/ruleset-snapshot/:version` | Snapshot específico |
| GET | `/payroll/receipts/:id/ruleset-snapshots` | Todos los snapshots |
| GET | `/payroll/receipts/:id/ruleset-snapshot/compare` | Comparar snapshots |
| GET | `/payroll/receipts/:id/calculation-context` | Contexto para reproducir |
| GET | `/payroll/receipts/:id/snapshot-integrity` | Verificar integridad |

### Uso

```typescript
// Capturar snapshot durante cálculo
await rulesetSnapshotService.captureSnapshot(payrollDetailId, {
  formulas: [...], // Array de fórmulas usadas
  umaDaily: 113.14,
  umaMonthly: 3440.98,
  smgDaily: 278.80,
  isrTableVersion: '2025-01',
  fiscalYear: 2025,
});

// Obtener contexto para reproducir
const context = await rulesetSnapshotService.getCalculationContext(detailId);
```

---

## 2. Flujo de Autorización de Timbrado

### Problema Resuelto
Antes, cualquier usuario con rol de nómina podía timbrar directamente. No había separación entre quien calcula y quien autoriza el timbrado fiscal.

### Solución Implementada

**Nuevo flujo:**
```
DRAFT → CALCULATED → APPROVED → [AUTHORIZED_FOR_STAMPING] → STAMPING → STAMPED
```

**Modelos:**

```prisma
model StampingAuthorization {
  id              String    @id @default(uuid())
  periodId        String
  authorizedBy    String
  authorizedAt    DateTime
  revokedAt       DateTime?
  revokedBy       String?
  revokeReason    String?
  isActive        Boolean   @default(true)
}
```

### Endpoints

| Método | Ruta | Descripción | Permiso Requerido |
|--------|------|-------------|-------------------|
| POST | `/payroll/periods/:id/authorize-stamping` | Autorizar timbrado | `payroll:authorize_stamping` |
| POST | `/payroll/periods/:id/revoke-stamping-auth` | Revocar autorización | `payroll:revoke_stamping_auth` |
| GET | `/payroll/periods/:id/stamping-eligibility` | Verificar elegibilidad | `payroll:read` |
| GET | `/payroll/periods/:id/authorization-history` | Historial | `payroll:view_versions` |

### Características

- **Checklist de verificación**: El autorizador debe confirmar que:
  - Revisó los cálculos
  - Verificó datos de empleados (RFC, CURP)
  - Revisó incidencias y excepciones

- **Revocación controlada**: Solo se puede revocar si no hay recibos ya timbrados

- **Auditoría completa**: Historial de autorizaciones y revocaciones

---

## 3. Sistema RBAC Completo

### Permisos Granulares

**Archivo: `/backend/src/common/constants/permissions.ts`**

#### Permisos de Nómina
```typescript
export const PAYROLL_PERMISSIONS = {
  READ: 'payroll:read',
  READ_OWN: 'payroll:read:own',
  CALCULATE: 'payroll:calculate',
  APPROVE: 'payroll:approve',
  AUTHORIZE_STAMPING: 'payroll:authorize_stamping',
  REVOKE_STAMPING_AUTH: 'payroll:revoke_stamping_auth',
  STAMP: 'payroll:stamp',
  CANCEL_STAMP: 'payroll:cancel_stamp',
  VIEW_VERSIONS: 'payroll:view_versions',
  VIEW_FISCAL_AUDIT: 'payroll:view_fiscal_audit',
  FULL_ACCESS: 'payroll:*',
};
```

#### Permisos de Documentos Fiscales
```typescript
export const FISCAL_DOCUMENT_PERMISSIONS = {
  READ: 'fiscal_docs:read',
  DOWNLOAD: 'fiscal_docs:download',
  VERIFY_INTEGRITY: 'fiscal_docs:verify_integrity',
  DELETE: 'fiscal_docs:delete',
  FULL_ACCESS: 'fiscal_docs:*',
};
```

### Roles Predefinidos

| Rol | Descripción | Permisos Clave |
|-----|-------------|----------------|
| `super_admin` | Acceso total | `*` |
| `company_admin` | Admin de empresa | `payroll:*`, `employees:*` |
| `rh_manager` | Gerente RH | `payroll:calculate`, `payroll:approve` |
| `payroll_authorizer` | Autorizador | `payroll:authorize_stamping` |
| `payroll_operator` | Operador | `payroll:calculate`, `payroll:stamp` |
| `auditor` | Auditor (solo lectura) | `payroll:view_*`, `fiscal_docs:*` |
| `employee` | Empleado | `payroll:read:own` |

### Uso en Controladores

```typescript
@Post('periods/:id/authorize-stamping')
@Permissions(PAYROLL_PERMISSIONS.AUTHORIZE_STAMPING)
async authorizeStamping(@Param('id') id: string) {
  // ...
}
```

---

## 4. Idempotencia y Concurrencia Blindada

### Problema Resuelto
Sin control de concurrencia, el mismo CFDI podría intentar timbrarse múltiples veces simultáneamente, generando duplicados o estados inconsistentes.

### Solución Implementada

**Modelo: `StampingAttempt`**

```prisma
model StampingAttempt {
  id              String    @id @default(uuid())
  cfdiId          String
  receiptVersion  Int
  idempotencyKey  String    @unique
  status          String    // PENDING, IN_PROGRESS, SUCCESS, FAILED, EXPIRED
  workerId        String?
  errorType       String?   // PAC_TEMPORARY, PAC_PERMANENT, VALIDATION
  errorMessage    String?
  pacResponse     Json?
}
```

### Flujo de Lock

```
1. acquireLock() → Verificar no existe SUCCESS previo
                 → Verificar no hay IN_PROGRESS activo
                 → Verificar no hay lock en CfdiNomina
                 → Adquirir lock exclusivo
                 → Crear/actualizar StampingAttempt

2. Proceso de timbrado...

3. releaseLock() → Actualizar estado (SUCCESS/FAILED)
                 → Liberar lock de CfdiNomina
```

### Características

- **Clave de idempotencia**: `SHA256(cfdiId + receiptVersion)`
- **Timeout de lock**: 5 minutos (configurable)
- **Cleanup automático**: Intentos huérfanos se expiran automáticamente
- **Clasificación de errores**:
  - `PAC_TEMPORARY`: Reintentar con backoff exponencial
  - `PAC_PERMANENT`: No reintentar
  - `VALIDATION`: Error en datos, requiere corrección

### Uso

```typescript
const lockResult = await idempotencyService.acquireLock(cfdiId, version, workerId);

if (!lockResult.acquired) {
  if (lockResult.reason === 'ALREADY_STAMPED') {
    return existingCfdi;
  }
  throw new ConflictException('Timbrado en proceso');
}

try {
  const result = await stampWithPAC(cfdiId);
  await idempotencyService.releaseLock(cfdiId, lockResult.attemptId, {
    success: true,
    pacResponse: result,
  });
} catch (error) {
  await idempotencyService.releaseLock(cfdiId, lockResult.attemptId, {
    success: false,
    errorType: classifyError(error),
    errorMessage: error.message,
  });
}
```

---

## 5. Evidencias Fiscales con Integridad

### Problema Resuelto
Los documentos fiscales (XML, PDF) se almacenaban sin verificación de integridad, sin posibilidad de detectar alteraciones.

### Solución Implementada

**Modelo: `ReceiptDocument`**

```prisma
model ReceiptDocument {
  id                String    @id @default(uuid())
  payrollDetailId   String
  cfdiId            String?
  type              String    // XML_ORIGINAL, XML_TIMBRADO, PDF, CANCEL_ACK
  storagePath       String    @unique
  fileName          String
  mimeType          String
  fileSize          Int
  sha256            String    // Hash de integridad
  version           Int
  isActive          Boolean   @default(true)

  // Soft delete
  deletedAt         DateTime?
  deletedBy         String?
  deleteReason      String?
}
```

### Tipos de Documento

| Tipo | Descripción |
|------|-------------|
| `XML_ORIGINAL` | XML sellado antes de timbrar |
| `XML_TIMBRADO` | XML con timbre fiscal |
| `PDF_RECIBO` | PDF del recibo de nómina |
| `CANCEL_REQUEST` | Solicitud de cancelación |
| `CANCEL_ACK` | Acuse de cancelación |
| `AUDIT_REPORT` | Reporte de auditoría |

### Estructura de Almacenamiento

```
/storage/fiscal/
  └── {companyId}/
      └── {year}/
          └── {periodNumber}/
              ├── {detailId}_xml_original_v1.xml
              ├── {detailId}_xml_timbrado_v1.xml
              └── {detailId}_pdf_recibo_v1.pdf
```

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/payroll/receipts/:id/documents` | Listar documentos |
| GET | `/payroll/documents/:id` | Metadatos de documento |
| GET | `/payroll/documents/:id/download` | Descargar documento |
| GET | `/payroll/documents/:id/verify` | Verificar integridad |
| GET | `/payroll/periods/:id/documents-integrity` | Verificar período completo |
| DELETE | `/payroll/documents/:id` | Eliminación lógica |

### Verificación de Integridad

```typescript
const result = await documentService.verifyIntegrity(documentId);
// {
//   documentId: '...',
//   isValid: true,
//   expectedHash: 'abc123...',
//   actualHash: 'abc123...',
//   fileExists: true,
//   verifiedAt: '2025-12-31T12:00:00Z'
// }
```

---

## 6. Componentes Frontend

### StampingAuthorizationPanel

Panel para gestionar autorizaciones de timbrado.

**Características:**
- Resumen de estado de recibos (pendientes, timbrados, con error)
- Checklist de verificación
- Formulario de autorización/revocación
- Historial de autorizaciones

**Uso:**
```tsx
import StampingAuthorizationPanel from '@/components/payroll/StampingAuthorizationPanel';

<StampingAuthorizationPanel
  periodId={periodId}
  periodStatus={period.status}
  onAuthorizationChange={() => refetch()}
/>
```

### FiscalAuditPanel

Panel de auditoría fiscal detallada.

**Características:**
- Resumen por tipo de concepto
- Detalle expandible por concepto
- Fórmulas aplicadas
- Excepciones detectadas
- Contexto de cálculo (snapshot)

**Uso:**
```tsx
import FiscalAuditPanel from '@/components/payroll/FiscalAuditPanel';

// Para período
<FiscalAuditPanel mode="period" periodId={periodId} />

// Para recibo individual
<FiscalAuditPanel mode="receipt" detailId={detailId} />
```

### VersionHistoryPanel

Panel de historial de versiones de recibos.

**Características:**
- Lista de versiones con metadatos
- Comparación lado a lado
- Visualización de diferencias (percepciones/deducciones)
- Razón de cada versión

**Uso:**
```tsx
import VersionHistoryPanel from '@/components/payroll/VersionHistoryPanel';

<VersionHistoryPanel detailId={detailId} />
```

---

## Migración de Base de Datos

### Archivo: `20251231100000_ruleset_snapshot_and_stamping_auth`

Esta migración crea:
- Tabla `receipt_ruleset_snapshot`
- Tabla `stamping_authorization`
- Tabla `stamping_attempt`
- Tabla `receipt_document`
- Campos adicionales en `payroll_period` y `cfdi_nominas`

### Ejecución

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

---

## Checklist de Implementación

- [x] Modelo y servicio `ReceiptRulesetSnapshot`
- [x] Modelo y servicio `StampingAuthorization`
- [x] Modelo y servicio `StampingAttempt` (idempotencia)
- [x] Modelo y servicio `ReceiptDocument`
- [x] Constantes de permisos RBAC
- [x] Endpoints en PayrollController
- [x] Componente `StampingAuthorizationPanel`
- [x] Componente `FiscalAuditPanel`
- [x] Componente `VersionHistoryPanel`
- [x] Endpoints en API frontend
- [x] Migración de base de datos

---

## Variables de Entorno Requeridas

```env
# Almacenamiento de documentos fiscales
FISCAL_STORAGE_PATH=/var/storage/fiscal

# Configuración de Prisma
DATABASE_URL=postgresql://...
```

---

## Notas de Seguridad

1. **Documentos fiscales**: Los XML timbrados de CFDIs válidos no pueden eliminarse físicamente. Solo eliminación lógica.

2. **Autorización de timbrado**: Una vez hay recibos timbrados, la autorización no puede revocarse.

3. **Integridad**: Cualquier discrepancia en SHA256 debe investigarse inmediatamente.

4. **Auditoría**: Todas las operaciones críticas se registran en `AuditLog`.

---

## Soporte

Para dudas o problemas, contactar al equipo de desarrollo.
