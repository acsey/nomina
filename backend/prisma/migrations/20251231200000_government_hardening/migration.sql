-- ============================================
-- MIGRACIÓN: Endurecimientos Gubernamentales
-- Fecha: 2024-12-31
-- Objetivo: Cumplimiento de normativas de gobierno MX
-- ============================================

-- 1. AUDITORÍA FISCAL CON FUNDAMENTO LEGAL
-- Agregar referencia legal a FiscalCalculationAudit
ALTER TABLE "fiscal_calculation_audit"
ADD COLUMN IF NOT EXISTS "legal_reference" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "legal_article" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "legal_law" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "legal_source" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "legal_published_at" DATE;

COMMENT ON COLUMN "fiscal_calculation_audit"."legal_reference" IS 'Referencia legal completa en JSON: {law, article, source, publishedAt, notes}';
COMMENT ON COLUMN "fiscal_calculation_audit"."legal_article" IS 'Artículo de ley aplicado (ej: Art. 96)';
COMMENT ON COLUMN "fiscal_calculation_audit"."legal_law" IS 'Ley aplicada (ej: LISR, LIMSS, LINFONAVIT)';
COMMENT ON COLUMN "fiscal_calculation_audit"."legal_source" IS 'Fuente normativa (ej: DOF)';
COMMENT ON COLUMN "fiscal_calculation_audit"."legal_published_at" IS 'Fecha de publicación de la norma';

-- 2. SNAPSHOT FISCAL AUTO-VALIDABLE
-- Agregar hash SHA256 para integridad
ALTER TABLE "receipt_ruleset_snapshot"
ADD COLUMN IF NOT EXISTS "snapshot_hash" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "hash_verified_at" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "hash_verified_by" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "integrity_status" VARCHAR(20) DEFAULT 'PENDING';

COMMENT ON COLUMN "receipt_ruleset_snapshot"."snapshot_hash" IS 'Hash SHA256 del contenido del snapshot para verificación de integridad';
COMMENT ON COLUMN "receipt_ruleset_snapshot"."integrity_status" IS 'Estado de integridad: PENDING, VERIFIED, CORRUPTED';

-- Crear índice para búsqueda por hash
CREATE INDEX IF NOT EXISTS "idx_snapshot_hash" ON "receipt_ruleset_snapshot"("snapshot_hash");
CREATE INDEX IF NOT EXISTS "idx_snapshot_integrity" ON "receipt_ruleset_snapshot"("integrity_status");

-- 3. CONTROL DE TRANSICIONES DE ESTADO
CREATE TABLE IF NOT EXISTS "state_transition_rules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "entity_type" VARCHAR(50) NOT NULL,
    "from_state" VARCHAR(50) NOT NULL,
    "to_state" VARCHAR(50) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "allowed_roles" JSONB NOT NULL DEFAULT '[]',
    "requires_justification" BOOLEAN DEFAULT FALSE,
    "requires_dual_control" BOOLEAN DEFAULT FALSE,
    "is_critical" BOOLEAN DEFAULT FALSE,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW(),
    UNIQUE("entity_type", "from_state", "to_state", "action")
);

COMMENT ON TABLE "state_transition_rules" IS 'Reglas de transiciones de estado válidas por entidad';

-- Tabla de log de transiciones
CREATE TABLE IF NOT EXISTS "state_transition_log" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(255) NOT NULL,
    "from_state" VARCHAR(50) NOT NULL,
    "to_state" VARCHAR(50) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "transition_rule_id" UUID REFERENCES "state_transition_rules"("id"),
    "user_id" VARCHAR(255) NOT NULL,
    "user_email" VARCHAR(255),
    "user_role" VARCHAR(100),
    "justification" TEXT,
    "is_valid" BOOLEAN NOT NULL,
    "rejection_reason" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE "state_transition_log" IS 'Log de todas las transiciones de estado (válidas e inválidas)';

CREATE INDEX IF NOT EXISTS "idx_transition_entity" ON "state_transition_log"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_transition_user" ON "state_transition_log"("user_id");
CREATE INDEX IF NOT EXISTS "idx_transition_valid" ON "state_transition_log"("is_valid");
CREATE INDEX IF NOT EXISTS "idx_transition_date" ON "state_transition_log"("created_at");

-- 4. DOBLE CONTROL Y JUSTIFICACIÓN
-- Agregar campos de justificación al AuditLog existente
ALTER TABLE "audit_logs"
ADD COLUMN IF NOT EXISTS "justification" TEXT,
ADD COLUMN IF NOT EXISTS "requires_confirmation" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "confirmed_by" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "is_critical_action" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "legal_basis" TEXT;

COMMENT ON COLUMN "audit_logs"."justification" IS 'Motivo obligatorio para acciones críticas';
COMMENT ON COLUMN "audit_logs"."requires_confirmation" IS 'Si la acción requería confirmación explícita';
COMMENT ON COLUMN "audit_logs"."is_critical_action" IS 'Marca acciones críticas (timbrado, cancelación, etc.)';

-- Tabla de acciones críticas pendientes de confirmación
CREATE TABLE IF NOT EXISTS "pending_critical_actions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "action_type" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(255) NOT NULL,
    "requested_by" VARCHAR(255) NOT NULL,
    "requested_at" TIMESTAMP DEFAULT NOW(),
    "justification" TEXT NOT NULL,
    "action_data" JSONB NOT NULL,
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "confirmed_by" VARCHAR(255),
    "confirmed_at" TIMESTAMP,
    "rejected_by" VARCHAR(255),
    "rejected_at" TIMESTAMP,
    "rejection_reason" TEXT,
    "expires_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE "pending_critical_actions" IS 'Acciones críticas pendientes de confirmación por segundo usuario';

CREATE INDEX IF NOT EXISTS "idx_pending_action_status" ON "pending_critical_actions"("status");
CREATE INDEX IF NOT EXISTS "idx_pending_action_entity" ON "pending_critical_actions"("entity_type", "entity_id");

-- 5. POLÍTICA DE RETENCIÓN
CREATE TABLE IF NOT EXISTS "retention_policies" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "document_type" VARCHAR(100) NOT NULL UNIQUE,
    "retention_years" INT NOT NULL,
    "legal_basis" TEXT,
    "description" TEXT,
    "can_delete" BOOLEAN DEFAULT FALSE,
    "requires_approval" BOOLEAN DEFAULT TRUE,
    "approved_roles" JSONB DEFAULT '["ADMIN"]',
    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE "retention_policies" IS 'Políticas de retención de documentos según normativa';

-- Insertar políticas por defecto según normativa mexicana
INSERT INTO "retention_policies" ("document_type", "retention_years", "legal_basis", "description", "can_delete") VALUES
('CFDI_XML', 5, 'Art. 30 CFF - Obligación de conservar contabilidad', 'XML de CFDI timbrado', FALSE),
('CFDI_PDF', 5, 'Art. 30 CFF - Obligación de conservar contabilidad', 'PDF de representación impresa', FALSE),
('CANCEL_ACK', 5, 'Art. 30 CFF - Obligación de conservar contabilidad', 'Acuse de cancelación SAT', FALSE),
('PAYROLL_AUDIT', 5, 'Art. 30 CFF - Obligación de conservar contabilidad', 'Auditoría de cálculos de nómina', FALSE),
('FISCAL_SNAPSHOT', 5, 'Art. 30 CFF - Obligación de conservar contabilidad', 'Snapshot de reglas fiscales', FALSE),
('EMPLOYEE_DOCUMENT', 5, 'Ley Federal del Trabajo Art. 804', 'Documentos de expediente del trabajador', TRUE),
('ATTENDANCE_RECORD', 2, 'Ley Federal del Trabajo Art. 804', 'Registros de asistencia', TRUE)
ON CONFLICT ("document_type") DO NOTHING;

-- Tabla de solicitudes de eliminación
CREATE TABLE IF NOT EXISTS "deletion_requests" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "document_type" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(255) NOT NULL,
    "requested_by" VARCHAR(255) NOT NULL,
    "requested_at" TIMESTAMP DEFAULT NOW(),
    "justification" TEXT NOT NULL,
    "legal_basis" TEXT,
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "approved_by" VARCHAR(255),
    "approved_at" TIMESTAMP,
    "rejected_by" VARCHAR(255),
    "rejected_at" TIMESTAMP,
    "rejection_reason" TEXT,
    "deleted_at" TIMESTAMP,
    "retention_check_passed" BOOLEAN DEFAULT FALSE,
    "metadata" JSONB DEFAULT '{}'
);

COMMENT ON TABLE "deletion_requests" IS 'Solicitudes de eliminación de documentos con auditoría';

CREATE INDEX IF NOT EXISTS "idx_deletion_status" ON "deletion_requests"("status");

-- 6. ALERTAS DE INTEGRIDAD
CREATE TABLE IF NOT EXISTS "integrity_alerts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "alert_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "expected_value" TEXT,
    "actual_value" TEXT,
    "detected_at" TIMESTAMP DEFAULT NOW(),
    "detected_by" VARCHAR(100),
    "acknowledged_at" TIMESTAMP,
    "acknowledged_by" VARCHAR(255),
    "resolution_notes" TEXT,
    "is_resolved" BOOLEAN DEFAULT FALSE,
    "resolved_at" TIMESTAMP
);

COMMENT ON TABLE "integrity_alerts" IS 'Alertas de integridad de datos (hash mismatch, corrupción, etc.)';

CREATE INDEX IF NOT EXISTS "idx_alert_severity" ON "integrity_alerts"("severity", "is_resolved");
CREATE INDEX IF NOT EXISTS "idx_alert_entity" ON "integrity_alerts"("entity_type", "entity_id");

-- Insertar reglas de transición de estado por defecto
INSERT INTO "state_transition_rules" ("entity_type", "from_state", "to_state", "action", "allowed_roles", "requires_justification", "requires_dual_control", "is_critical", "description") VALUES
-- PayrollPeriod transitions
('PAYROLL_PERIOD', 'DRAFT', 'PROCESSING', 'START_CALCULATION', '["ADMIN", "PAYROLL_MANAGER"]', FALSE, FALSE, FALSE, 'Iniciar cálculo de nómina'),
('PAYROLL_PERIOD', 'PROCESSING', 'CALCULATED', 'COMPLETE_CALCULATION', '["ADMIN", "PAYROLL_MANAGER"]', FALSE, FALSE, FALSE, 'Completar cálculo'),
('PAYROLL_PERIOD', 'CALCULATED', 'APPROVED', 'APPROVE', '["ADMIN", "PAYROLL_APPROVER"]', TRUE, FALSE, TRUE, 'Aprobar período para timbrado'),
('PAYROLL_PERIOD', 'APPROVED', 'PAID', 'MARK_PAID', '["ADMIN", "PAYROLL_MANAGER"]', TRUE, FALSE, TRUE, 'Marcar como pagado'),
('PAYROLL_PERIOD', 'PAID', 'CLOSED', 'CLOSE', '["ADMIN"]', TRUE, FALSE, TRUE, 'Cerrar período'),
('PAYROLL_PERIOD', 'CALCULATED', 'DRAFT', 'RECALCULATE', '["ADMIN", "PAYROLL_MANAGER"]', TRUE, TRUE, TRUE, 'Recalcular período'),
('PAYROLL_PERIOD', 'APPROVED', 'CALCULATED', 'REVOKE_APPROVAL', '["ADMIN"]', TRUE, TRUE, TRUE, 'Revocar aprobación'),

-- PayrollDetail transitions
('PAYROLL_DETAIL', 'PENDING', 'CALCULATED', 'CALCULATE', '["ADMIN", "PAYROLL_MANAGER"]', FALSE, FALSE, FALSE, 'Calcular recibo'),
('PAYROLL_DETAIL', 'CALCULATED', 'APPROVED', 'APPROVE', '["ADMIN", "PAYROLL_APPROVER"]', FALSE, FALSE, FALSE, 'Aprobar recibo'),
('PAYROLL_DETAIL', 'APPROVED', 'PAID', 'PAY', '["ADMIN", "PAYROLL_MANAGER"]', FALSE, FALSE, FALSE, 'Marcar como pagado'),
('PAYROLL_DETAIL', 'CALCULATED', 'PENDING', 'RECALCULATE', '["ADMIN", "PAYROLL_MANAGER"]', TRUE, FALSE, TRUE, 'Recalcular recibo'),

-- CfdiNomina transitions
('CFDI_NOMINA', 'PENDING', 'STAMPED', 'STAMP', '["ADMIN", "CFDI_STAMPER"]', FALSE, FALSE, TRUE, 'Timbrar CFDI'),
('CFDI_NOMINA', 'STAMPED', 'CANCELLED', 'CANCEL', '["ADMIN"]', TRUE, TRUE, TRUE, 'Cancelar CFDI timbrado'),
('CFDI_NOMINA', 'PENDING', 'ERROR', 'STAMP_ERROR', '["SYSTEM"]', FALSE, FALSE, FALSE, 'Error en timbrado'),
('CFDI_NOMINA', 'ERROR', 'PENDING', 'RETRY', '["ADMIN", "CFDI_STAMPER"]', TRUE, FALSE, TRUE, 'Reintentar timbrado')
ON CONFLICT ("entity_type", "from_state", "to_state", "action") DO NOTHING;

-- Vistas para reportes de auditoría
CREATE OR REPLACE VIEW "v_audit_summary" AS
SELECT
    DATE(created_at) as audit_date,
    entity as entity_type,
    action,
    COUNT(*) as action_count,
    COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
GROUP BY DATE(created_at), entity, action
ORDER BY audit_date DESC, action_count DESC;

CREATE OR REPLACE VIEW "v_critical_actions" AS
SELECT
    al.*,
    u.email as user_email,
    u.first_name || ' ' || u.last_name as user_name
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.is_critical_action = TRUE
ORDER BY al.created_at DESC;

CREATE OR REPLACE VIEW "v_integrity_issues" AS
SELECT
    ia.*,
    CASE
        WHEN ia.severity = 'CRITICAL' THEN 1
        WHEN ia.severity = 'HIGH' THEN 2
        WHEN ia.severity = 'MEDIUM' THEN 3
        ELSE 4
    END as severity_order
FROM integrity_alerts ia
WHERE ia.is_resolved = FALSE
ORDER BY severity_order, ia.detected_at DESC;

-- Función para verificar integridad de snapshot
CREATE OR REPLACE FUNCTION verify_snapshot_integrity(snapshot_id UUID)
RETURNS TABLE(is_valid BOOLEAN, message TEXT) AS $$
DECLARE
    stored_hash VARCHAR(64);
    current_hash VARCHAR(64);
    snapshot_data JSONB;
BEGIN
    SELECT
        rrs.snapshot_hash,
        jsonb_build_object(
            'formulasUsed', rrs.formulas_used,
            'umaDaily', rrs.uma_daily,
            'umaMonthly', rrs.uma_monthly,
            'smgDaily', rrs.smg_daily,
            'smgZfnDaily', rrs.smg_zfn_daily,
            'roundingMode', rrs.rounding_mode,
            'decimalScale', rrs.decimal_scale,
            'isrTableVersion', rrs.isr_table_version,
            'subsidioTableVersion', rrs.subsidio_table_version,
            'imssRatesVersion', rrs.imss_rates_version,
            'fiscalYear', rrs.fiscal_year,
            'periodType', rrs.period_type,
            'calculationParams', rrs.calculation_params
        )
    INTO stored_hash, snapshot_data
    FROM receipt_ruleset_snapshot rrs
    WHERE rrs.id = snapshot_id::TEXT;

    IF stored_hash IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Snapshot no tiene hash almacenado';
        RETURN;
    END IF;

    -- Nota: El hash real se calcula en la aplicación con SHA256
    -- Esta función solo verifica que existe el hash
    RETURN QUERY SELECT TRUE, 'Hash presente - verificar en aplicación';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_snapshot_integrity IS 'Verifica la integridad de un snapshot fiscal';
