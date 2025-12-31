# Manual Técnico para Auditoría

## Sistema de Nómina - Documentación para Auditores

### Índice
1. [Arquitectura de Auditoría](#arquitectura-de-auditoría)
2. [Modelos de Datos](#modelos-de-datos)
3. [Trazabilidad de Cálculos](#trazabilidad-de-cálculos)
4. [Verificación de Integridad](#verificación-de-integridad)
5. [Exportación de Datos](#exportación-de-datos)
6. [Validación de Cumplimiento](#validación-de-cumplimiento)
7. [Consultas SQL para Auditoría](#consultas-sql-para-auditoría)

---

## Arquitectura de Auditoría

### Principios de Diseño

1. **Inmutabilidad**: Los datos fiscales no se modifican, se versionan
2. **Trazabilidad**: Cada acción tiene usuario, fecha y justificación
3. **Reproducibilidad**: Los cálculos pueden recrearse con snapshots
4. **Integridad**: Hash SHA256 verifica datos no alterados

### Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE AUDITORÍA                        │
├─────────────────┬─────────────────┬─────────────────────────┤
│ FiscalAudit     │ StateTransition │ IntegrityCheck          │
│ (cálculos)      │ (estados)       │ (snapshots)             │
├─────────────────┴─────────────────┴─────────────────────────┤
│                    CAPA DE DATOS                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│ PayrollDetail   │ CfdiNomina      │ ReceiptDocument         │
│ Versions        │ StampingAttempt │ RulesetSnapshot         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

---

## Modelos de Datos

### FiscalCalculationAudit

Registra cada cálculo fiscal con fundamento legal.

```sql
-- Estructura
CREATE TABLE fiscal_calculation_audit (
    id UUID PRIMARY KEY,
    payroll_detail_id UUID NOT NULL,
    concept_type VARCHAR(50),        -- ISR, IMSS_EMPLOYEE, IMSS_EMPLOYER, ISN
    concept_code VARCHAR(50),
    input_values JSONB,              -- Valores de entrada
    rule_applied VARCHAR(255),       -- Regla usada
    rule_version VARCHAR(50),
    table_used VARCHAR(100),         -- Tabla fiscal usada
    calculation_base DECIMAL(14,2),  -- Base de cálculo
    limit_inferior DECIMAL(14,2),
    excedente DECIMAL(14,2),
    impuesto_marginal DECIMAL(14,2),
    cuota_fija DECIMAL(14,2),
    result_amount DECIMAL(14,2),     -- Resultado
    -- REFERENCIA LEGAL
    legal_law VARCHAR(100),          -- LISR, LSS, LFT
    legal_article VARCHAR(50),       -- Art. 96
    legal_source VARCHAR(100),       -- DOF
    legal_published_at DATE,
    legal_reference JSONB,           -- Objeto completo
    fiscal_year INT,
    period_type VARCHAR(20),
    calculated_at TIMESTAMP,
    calculated_by VARCHAR(255)
);
```

### PayrollDetailVersion

Historial inmutable de versiones de recibos.

```sql
CREATE TABLE payroll_detail_versions (
    id UUID PRIMARY KEY,
    payroll_detail_id UUID NOT NULL,
    version INT NOT NULL,
    worked_days DECIMAL(5,2),
    total_perceptions DECIMAL(12,2),
    total_deductions DECIMAL(12,2),
    net_pay DECIMAL(12,2),
    status VARCHAR(20),
    perceptions_snapshot JSONB,      -- Detalle de percepciones
    deductions_snapshot JSONB,       -- Detalle de deducciones
    calculation_config JSONB,        -- Configuración usada
    created_by VARCHAR(255),
    created_reason TEXT,             -- INITIAL, RECALCULATION, CORRECTION
    cfdi_uuid VARCHAR(50),
    cfdi_status VARCHAR(20),
    created_at TIMESTAMP
);
```

### ReceiptRulesetSnapshot

Snapshot de reglas fiscales para reproducibilidad.

```sql
CREATE TABLE receipt_ruleset_snapshot (
    id UUID PRIMARY KEY,
    payroll_detail_id UUID NOT NULL,
    version INT,
    formulas_used JSONB,             -- Fórmulas aplicadas
    uma_daily DECIMAL(14,4),         -- UMA diaria
    uma_monthly DECIMAL(14,4),       -- UMA mensual
    smg_daily DECIMAL(14,4),         -- Salario mínimo
    smg_zfn_daily DECIMAL(14,4),     -- SMG zona frontera
    rounding_mode VARCHAR(20),
    decimal_scale INT,
    isr_table_version VARCHAR(50),
    subsidio_table_version VARCHAR(50),
    imss_rates_version VARCHAR(50),
    fiscal_year INT,
    period_type VARCHAR(20),
    calculation_params JSONB,
    -- INTEGRIDAD
    snapshot_hash VARCHAR(64),       -- SHA256
    integrity_status VARCHAR(20),    -- PENDING, VERIFIED, CORRUPTED
    hash_verified_at TIMESTAMP,
    hash_verified_by VARCHAR(255),
    created_at TIMESTAMP,
    created_by VARCHAR(255)
);
```

### StateTransitionLog

Registro de transiciones de estado.

```sql
CREATE TABLE state_transition_log (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50),         -- PAYROLL_PERIOD, CFDI_NOMINA, etc.
    entity_id VARCHAR(255),
    from_state VARCHAR(50),
    to_state VARCHAR(50),
    action VARCHAR(100),
    transition_rule_id UUID,
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    user_role VARCHAR(100),
    justification TEXT,
    is_valid BOOLEAN,
    rejection_reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP
);
```

---

## Trazabilidad de Cálculos

### Estructura de Auditoría Fiscal

Cada cálculo fiscal registra:

```json
{
  "conceptType": "ISR",
  "conceptCode": "ISR_MENSUAL",
  "inputValues": {
    "baseTaxable": 15000.00,
    "periodType": "MONTHLY"
  },
  "ruleApplied": "ISR_ART_96_TARIFA_MENSUAL",
  "ruleVersion": "2024.1",
  "tableUsed": "ISR_MENSUAL_2024",
  "calculationBase": 15000.00,
  "limitInferior": 13381.48,
  "excedente": 1618.52,
  "impuestoMarginal": 340.76,
  "cuotaFija": 1222.58,
  "resultAmount": 1563.34,
  "legalReference": {
    "law": "LISR",
    "article": "Art. 96",
    "source": "DOF",
    "publishedAt": "2024-12-27"
  }
}
```

### Verificación de Cálculo

Para reproducir un cálculo:

1. Obtener el snapshot de reglas del recibo
2. Obtener los valores de entrada
3. Aplicar las fórmulas documentadas
4. Comparar con el resultado almacenado

---

## Verificación de Integridad

### Hash SHA256 de Snapshots

El hash se calcula sobre:

```javascript
{
  calculationParams: {...},
  decimalScale: 2,
  fiscalYear: 2024,
  formulasUsed: [...],
  imssRatesVersion: "2024.1",
  isrTableVersion: "2024.1",
  periodType: "MONTHLY",
  roundingMode: "HALF_UP",
  smgDaily: 248.93,
  smgZfnDaily: 374.89,
  subsidioTableVersion: "2024.1",
  umaDaily: 108.57,
  umaMonthly: 3301.73
}
```

### Verificación Automática

El sistema verifica integridad:

1. Al consultar un recibo histórico
2. En verificaciones programadas
3. Antes de exportar para auditoría

### Alertas de Integridad

Si el hash no coincide:

1. Se crea alerta tipo `HASH_MISMATCH`
2. Severidad: `CRITICAL`
3. Se notifica a administradores
4. Se bloquea modificación hasta resolución

---

## Exportación de Datos

### Endpoints de Exportación

```
GET /api/government/export/fiscal-audit
GET /api/government/export/receipts
GET /api/government/export/snapshots
GET /api/government/export/critical-actions
GET /api/government/export/state-transitions
GET /api/government/export/period-report/:periodId
```

### Parámetros

| Parámetro | Descripción |
|-----------|-------------|
| `companyId` | ID de empresa |
| `periodId` | ID de período (opcional) |
| `startDate` | Fecha inicio |
| `endDate` | Fecha fin |
| `format` | csv, xlsx, json |
| `includeVersions` | Incluir versiones |
| `includeSnapshots` | Incluir snapshots |

### Formato de Exportación

#### CSV/Excel

```csv
fecha_calculo,empleado_numero,empleado_rfc,tipo_concepto,base_calculo,resultado,ley_aplicada,articulo
2024-12-15,EMP001,XAXX010101XXX,ISR,15000.00,1563.34,LISR,Art. 96
```

#### JSON

```json
{
  "exportedAt": "2024-12-31T10:00:00Z",
  "recordCount": 150,
  "data": [
    {
      "fecha_calculo": "2024-12-15T10:00:00Z",
      "empleado_numero": "EMP001",
      "tipo_concepto": "ISR",
      "base_calculo": 15000.00,
      "resultado": 1563.34,
      "ley_aplicada": "LISR",
      "articulo": "Art. 96"
    }
  ]
}
```

---

## Validación de Cumplimiento

### Checklist de Verificación

#### 1. Trazabilidad

- [ ] Cada cálculo tiene usuario y fecha
- [ ] Referencias legales presentes
- [ ] Historial de versiones completo

#### 2. Inmutabilidad

- [ ] Versiones no modificadas
- [ ] Hash de integridad válido
- [ ] Evidencias fiscales preservadas

#### 3. Separación de Funciones

- [ ] Quien calcula ≠ quien autoriza
- [ ] Acciones críticas tienen doble control
- [ ] Logs de transiciones completos

#### 4. Reproducibilidad

- [ ] Snapshots de reglas guardados
- [ ] Fórmulas versionadas
- [ ] Tablas fiscales preservadas

---

## Consultas SQL para Auditoría

### Auditoría Fiscal por Período

```sql
SELECT
    e.employee_number,
    e.rfc,
    fca.concept_type,
    fca.concept_code,
    fca.calculation_base,
    fca.result_amount,
    fca.legal_law,
    fca.legal_article,
    fca.calculated_at
FROM fiscal_calculation_audit fca
JOIN payroll_details pd ON fca.payroll_detail_id = pd.id
JOIN employees e ON pd.employee_id = e.id
WHERE pd.payroll_period_id = 'PERIOD_UUID'
ORDER BY e.employee_number, fca.concept_type;
```

### Verificar Integridad de Snapshots

```sql
SELECT
    rrs.id,
    rrs.integrity_status,
    rrs.snapshot_hash,
    rrs.hash_verified_at,
    pd.id as receipt_id,
    e.employee_number
FROM receipt_ruleset_snapshot rrs
JOIN payroll_details pd ON rrs.payroll_detail_id = pd.id
JOIN employees e ON pd.employee_id = e.id
WHERE rrs.integrity_status != 'VERIFIED'
ORDER BY rrs.created_at DESC;
```

### Historial de Transiciones

```sql
SELECT
    stl.entity_type,
    stl.entity_id,
    stl.from_state,
    stl.to_state,
    stl.action,
    stl.user_email,
    stl.justification,
    stl.is_valid,
    stl.created_at
FROM state_transition_log stl
WHERE stl.entity_type = 'PAYROLL_PERIOD'
  AND stl.entity_id = 'PERIOD_UUID'
ORDER BY stl.created_at;
```

### Acciones Críticas

```sql
SELECT
    al.action,
    al.entity,
    al.entity_id,
    u.email,
    al.justification,
    al.created_at
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.is_critical_action = TRUE
  AND al.created_at BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY al.created_at DESC;
```

### Comparación de Versiones

```sql
SELECT
    v1.version as version_anterior,
    v2.version as version_actual,
    v1.total_perceptions as perc_anterior,
    v2.total_perceptions as perc_actual,
    v2.total_perceptions - v1.total_perceptions as diferencia_perc,
    v2.created_reason,
    v2.created_by,
    v2.created_at
FROM payroll_detail_versions v1
JOIN payroll_detail_versions v2
    ON v1.payroll_detail_id = v2.payroll_detail_id
    AND v2.version = v1.version + 1
WHERE v1.payroll_detail_id = 'RECEIPT_UUID'
ORDER BY v1.version;
```

---

## Vistas Predefinidas

### v_audit_summary

Resumen diario de acciones.

```sql
SELECT * FROM v_audit_summary
WHERE audit_date >= CURRENT_DATE - INTERVAL '30 days';
```

### v_critical_actions

Acciones críticas con detalle de usuario.

```sql
SELECT * FROM v_critical_actions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
```

### v_integrity_issues

Problemas de integridad pendientes.

```sql
SELECT * FROM v_integrity_issues;
```

---

## Contacto

Para consultas técnicas de auditoría:
- Administrador de Base de Datos
- Oficial de Cumplimiento

---

*Documento generado por Sistema de Nómina v1.0*
*Última actualización: Diciembre 2024*
