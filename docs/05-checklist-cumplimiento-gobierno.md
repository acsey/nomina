# Checklist de Cumplimiento - Gobierno MX

## Sistema de Nómina - Verificación de Cumplimiento Normativo

### Fecha de Verificación: ________________
### Verificado por: ________________
### Período auditado: ________________

---

## 1. TRAZABILIDAD TOTAL

### 1.1 Identificación de Acciones
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 1.1.1 | Cada acción registra usuario (ID y email) | ☐ | `audit_logs.user_id` | |
| 1.1.2 | Cada acción registra fecha y hora | ☐ | `audit_logs.created_at` | |
| 1.1.3 | Cada acción registra IP de origen | ☐ | `audit_logs.ip_address` | |
| 1.1.4 | Acciones críticas tienen justificación | ☐ | `audit_logs.justification` | |

### 1.2 Fundamento Legal
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 1.2.1 | Cálculos ISR referencian Art. 96 LISR | ☐ | `fiscal_calculation_audit.legal_article` | |
| 1.2.2 | Cálculos IMSS referencian LSS | ☐ | `fiscal_calculation_audit.legal_law` | |
| 1.2.3 | Fuente normativa documentada (DOF) | ☐ | `fiscal_calculation_audit.legal_source` | |
| 1.2.4 | Fecha de publicación registrada | ☐ | `fiscal_calculation_audit.legal_published_at` | |

### 1.3 Historial Completo
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 1.3.1 | Transiciones de estado registradas | ☐ | `state_transition_log` | |
| 1.3.2 | Intentos de transición inválidos registrados | ☐ | `state_transition_log.is_valid = false` | |
| 1.3.3 | Historial de versiones de recibos | ☐ | `payroll_detail_versions` | |
| 1.3.4 | Log de acceso a secretos | ☐ | `secret_access_logs` | |

---

## 2. INMUTABILIDAD DOCUMENTAL

### 2.1 Versionado de Recibos
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 2.1.1 | Recálculos crean nueva versión | ☐ | `payroll_detail_versions.version` | |
| 2.1.2 | Versión anterior no modificada | ☐ | Comparación de snapshots | |
| 2.1.3 | Motivo de recálculo documentado | ☐ | `payroll_detail_versions.created_reason` | |
| 2.1.4 | Usuario que recalculó registrado | ☐ | `payroll_detail_versions.created_by` | |

### 2.2 Protección de CFDI
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 2.2.1 | CFDI timbrado no modificable | ☐ | Validación en código | |
| 2.2.2 | Cancelación requiere motivo SAT | ☐ | `cfdi_nominas.cancellation_reason` | |
| 2.2.3 | Acuse de cancelación almacenado | ☐ | `receipt_document.type = CANCEL_ACK` | |
| 2.2.4 | XML original preservado | ☐ | `receipt_document.type = XML_ORIGINAL` | |

### 2.3 Evidencias Fiscales
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 2.3.1 | XML timbrado almacenado | ☐ | Directorio fiscal storage | |
| 2.3.2 | PDF de recibo almacenado | ☐ | `receipt_document.type = PDF` | |
| 2.3.3 | Hash SHA256 de archivos | ☐ | `receipt_document.sha256` | |
| 2.3.4 | Política de retención 5 años | ☐ | `retention_policies.retention_years >= 5` | |

---

## 3. SEPARACIÓN DE FUNCIONES

### 3.1 Roles y Permisos
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 3.1.1 | Roles definidos por función | ☐ | Tabla `roles` | |
| 3.1.2 | Permisos granulares asignados | ☐ | `roles.permissions` | |
| 3.1.3 | Usuario no puede auto-aprobar | ☐ | Validación en código | |
| 3.1.4 | Doble control en acciones críticas | ☐ | `pending_critical_actions` | |

### 3.2 Flujo de Autorización
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 3.2.1 | Quien calcula ≠ quien autoriza | ☐ | Reglas de transición | |
| 3.2.2 | Quien autoriza ≠ quien timbra | ☐ | Reglas de transición | |
| 3.2.3 | Cancelación requiere segundo usuario | ☐ | `state_transition_rules.requires_dual_control` | |
| 3.2.4 | Recálculo requiere justificación | ☐ | `state_transition_rules.requires_justification` | |

### 3.3 Control de Acceso
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 3.3.1 | Autenticación obligatoria | ☐ | JWT implementado | |
| 3.3.2 | Sesiones con expiración | ☐ | `JWT_EXPIRES_IN` | |
| 3.3.3 | Intentos fallidos registrados | ☐ | `audit_logs.action = LOGIN_FAILED` | |
| 3.3.4 | Acceso por empresa controlado | ☐ | `users.company_id` | |

---

## 4. REPRODUCIBILIDAD

### 4.1 Snapshot de Reglas
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 4.1.1 | Cada recibo tiene snapshot | ☐ | `receipt_ruleset_snapshot` | |
| 4.1.2 | Valores UMA/SMG preservados | ☐ | Campos `uma_daily`, `smg_daily` | |
| 4.1.3 | Versión de tablas fiscales | ☐ | `isr_table_version`, etc. | |
| 4.1.4 | Fórmulas usadas documentadas | ☐ | `formulas_used` JSON | |

### 4.2 Verificación de Integridad
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 4.2.1 | Hash SHA256 calculado | ☐ | `receipt_ruleset_snapshot.snapshot_hash` | |
| 4.2.2 | Verificación automática | ☐ | Servicio `SnapshotIntegrityService` | |
| 4.2.3 | Alertas de corrupción | ☐ | `integrity_alerts` | |
| 4.2.4 | Estado de integridad registrado | ☐ | `integrity_status` | |

### 4.3 Auditoría de Cálculos
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 4.3.1 | Cada cálculo fiscal auditado | ☐ | `fiscal_calculation_audit` | |
| 4.3.2 | Base de cálculo documentada | ☐ | `calculation_base` | |
| 4.3.3 | Pasos intermedios registrados | ☐ | Campos de desglose | |
| 4.3.4 | Tabla/regla aplicada identificada | ☐ | `table_used`, `rule_applied` | |

---

## 5. TRANSPARENCIA

### 5.1 Exportación de Datos
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 5.1.1 | Exportación a Excel disponible | ☐ | Endpoint `/export` | |
| 5.1.2 | Exportación a CSV disponible | ☐ | Formato CSV | |
| 5.1.3 | Exportación a JSON disponible | ☐ | Formato JSON | |
| 5.1.4 | Sin dependencia del sistema | ☐ | Archivos autónomos | |

### 5.2 Reportes de Auditoría
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 5.2.1 | Reporte de período completo | ☐ | `/export/period-report` | |
| 5.2.2 | Auditoría fiscal exportable | ☐ | `/export/fiscal-audit` | |
| 5.2.3 | Log de acciones críticas | ☐ | `/export/critical-actions` | |
| 5.2.4 | Transiciones de estado | ☐ | `/export/state-transitions` | |

### 5.3 Monitoreo Operativo
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 5.3.1 | Health check general | ☐ | `GET /health` | |
| 5.3.2 | Health check de BD | ☐ | `GET /health/db` | |
| 5.3.3 | Health check de Redis | ☐ | `GET /health/redis` | |
| 5.3.4 | Health check de storage | ☐ | `GET /health/storage` | |

---

## 6. RETENCIÓN Y RESPALDOS

### 6.1 Políticas de Retención
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 6.1.1 | CFDI XML: 5 años mínimo | ☐ | `retention_policies` | |
| 6.1.2 | Auditorías: 5 años mínimo | ☐ | Configuración | |
| 6.1.3 | Evidencias: 5 años mínimo | ☐ | Art. 30 CFF | |
| 6.1.4 | Eliminación requiere aprobación | ☐ | `deletion_requests` | |

### 6.2 Respaldos
| # | Requisito | Cumple | Evidencia | Observaciones |
|---|-----------|--------|-----------|---------------|
| 6.2.1 | Backup de BD documentado | ☐ | Guía de backups | |
| 6.2.2 | Backup de storage documentado | ☐ | Guía de backups | |
| 6.2.3 | Procedimiento de restauración | ☐ | Documentación | |
| 6.2.4 | Pruebas de restauración | ☐ | Registro de pruebas | |

---

## RESUMEN DE CUMPLIMIENTO

| Sección | Total | Cumple | No Cumple | % |
|---------|-------|--------|-----------|---|
| 1. Trazabilidad | 12 | | | |
| 2. Inmutabilidad | 12 | | | |
| 3. Separación de Funciones | 12 | | | |
| 4. Reproducibilidad | 12 | | | |
| 5. Transparencia | 12 | | | |
| 6. Retención | 8 | | | |
| **TOTAL** | **68** | | | |

---

## OBSERVACIONES GENERALES

```
______________________________________________________________________________

______________________________________________________________________________

______________________________________________________________________________

______________________________________________________________________________
```

---

## FIRMAS

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Auditor | | | |
| Responsable Sistema | | | |
| Oficial Cumplimiento | | | |

---

*Checklist basado en normativas: CFF Art. 30, LISR, LSS, LFT*
*Sistema de Nómina v1.0 - Diciembre 2024*
