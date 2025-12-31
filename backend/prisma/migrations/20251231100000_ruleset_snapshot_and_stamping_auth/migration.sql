-- ============================================
-- MEJORA 1: Snapshot de Reglas por Recibo
-- ============================================

-- Tabla para almacenar snapshot de reglas usadas en cada recibo
CREATE TABLE IF NOT EXISTS "receipt_ruleset_snapshot" (
    "id" TEXT NOT NULL,
    "payroll_detail_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    -- Fórmulas usadas
    "formulas_used" JSONB NOT NULL DEFAULT '[]',

    -- Valores fiscales vigentes al momento del cálculo
    "uma_daily" DECIMAL(14, 4) NOT NULL,
    "uma_monthly" DECIMAL(14, 4) NOT NULL,
    "smg_daily" DECIMAL(14, 4) NOT NULL,
    "smg_zfn_daily" DECIMAL(14, 4),

    -- Configuración de cálculo
    "rounding_mode" TEXT NOT NULL DEFAULT 'HALF_UP',
    "decimal_scale" INTEGER NOT NULL DEFAULT 2,

    -- Tablas fiscales usadas
    "isr_table_version" TEXT,
    "subsidio_table_version" TEXT,
    "imss_rates_version" TEXT,

    -- Parámetros adicionales
    "fiscal_year" INTEGER NOT NULL,
    "period_type" TEXT NOT NULL,
    "calculation_params" JSONB NOT NULL DEFAULT '{}',

    -- Metadata
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "receipt_ruleset_snapshot_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE INDEX IF NOT EXISTS "idx_ruleset_snapshot_detail"
ON "receipt_ruleset_snapshot" ("payroll_detail_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_ruleset_snapshot_detail_version"
ON "receipt_ruleset_snapshot" ("payroll_detail_id", "version");

-- Foreign key
ALTER TABLE "receipt_ruleset_snapshot"
ADD CONSTRAINT "receipt_ruleset_snapshot_payroll_detail_fkey"
FOREIGN KEY ("payroll_detail_id") REFERENCES "payroll_details"("id") ON DELETE RESTRICT;

-- ============================================
-- MEJORA 2: Flujo de Autorización de Timbrado
-- ============================================

-- Agregar estado AUTHORIZED a PayrollStatus si no existe
-- (Prisma maneja esto, pero agregamos columna de autorización)

ALTER TABLE "payroll_periods"
ADD COLUMN IF NOT EXISTS "authorized_for_stamping" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "authorized_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "authorized_by" TEXT;

-- Tabla de registro de autorizaciones
CREATE TABLE IF NOT EXISTS "stamping_authorization" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "authorized_by" TEXT NOT NULL,
    "authorized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoked_by" TEXT,
    "revoke_reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "details" JSONB,

    CONSTRAINT "stamping_authorization_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_stamping_auth_period"
ON "stamping_authorization" ("period_id", "is_active");

ALTER TABLE "stamping_authorization"
ADD CONSTRAINT "stamping_authorization_period_fkey"
FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE RESTRICT;

-- ============================================
-- MEJORA 3: Permisos Granulares RBAC
-- ============================================

-- Agregar nuevos permisos al catálogo
INSERT INTO "permissions" ("id", "name", "description", "module", "created_at")
VALUES
    (gen_random_uuid(), 'PAYROLL_CALCULATE', 'Calcular nómina', 'PAYROLL', NOW()),
    (gen_random_uuid(), 'PAYROLL_RECALCULATE', 'Recalcular nómina existente', 'PAYROLL', NOW()),
    (gen_random_uuid(), 'PAYROLL_AUTHORIZE_STAMPING', 'Autorizar timbrado de nómina', 'PAYROLL', NOW()),
    (gen_random_uuid(), 'PAYROLL_STAMP_ENQUEUE', 'Encolar CFDIs para timbrado', 'PAYROLL', NOW()),
    (gen_random_uuid(), 'PAYROLL_STAMP_RETRY', 'Reintentar timbrado fallido', 'PAYROLL', NOW()),
    (gen_random_uuid(), 'RULESET_MANAGE', 'Gestionar reglas de cálculo', 'CONFIG', NOW()),
    (gen_random_uuid(), 'AUDIT_VIEW', 'Ver auditoría del sistema', 'AUDIT', NOW()),
    (gen_random_uuid(), 'REPORT_EXPORT', 'Exportar reportes', 'REPORTS', NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- MEJORA 4: Idempotencia de Timbrado
-- ============================================

-- Tabla de intentos de timbrado para idempotencia
CREATE TABLE IF NOT EXISTS "stamping_attempt" (
    "id" TEXT NOT NULL,
    "cfdi_id" TEXT NOT NULL,
    "receipt_version" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, SUCCESS, FAILED
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "worker_id" TEXT,
    "error_message" TEXT,
    "error_type" TEXT,
    "pac_response" JSONB,

    CONSTRAINT "stamping_attempt_pkey" PRIMARY KEY ("id")
);

-- Índice único para idempotencia
CREATE UNIQUE INDEX IF NOT EXISTS "idx_stamping_attempt_idempotency"
ON "stamping_attempt" ("idempotency_key");

CREATE INDEX IF NOT EXISTS "idx_stamping_attempt_cfdi"
ON "stamping_attempt" ("cfdi_id", "status");

ALTER TABLE "stamping_attempt"
ADD CONSTRAINT "stamping_attempt_cfdi_fkey"
FOREIGN KEY ("cfdi_id") REFERENCES "cfdi_nominas"("id") ON DELETE CASCADE;

-- Lock advisory para evitar concurrencia
-- (Se maneja en código, pero agregamos columna de lock)
ALTER TABLE "cfdi_nominas"
ADD COLUMN IF NOT EXISTS "stamp_lock_id" TEXT,
ADD COLUMN IF NOT EXISTS "stamp_lock_at" TIMESTAMP(3);

-- ============================================
-- MEJORA 5: Evidencias Fiscales con Integridad
-- ============================================

CREATE TABLE IF NOT EXISTS "receipt_document" (
    "id" TEXT NOT NULL,
    "payroll_detail_id" TEXT NOT NULL,
    "cfdi_id" TEXT,
    "type" TEXT NOT NULL, -- XML_ORIGINAL, XML_TIMBRADO, PDF, CANCEL_ACK, CANCEL_REQUEST
    "storage_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "delete_reason" TEXT,

    CONSTRAINT "receipt_document_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_receipt_document_detail"
ON "receipt_document" ("payroll_detail_id", "type", "is_active");

CREATE INDEX IF NOT EXISTS "idx_receipt_document_cfdi"
ON "receipt_document" ("cfdi_id");

-- Índice único para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS "idx_receipt_document_path"
ON "receipt_document" ("storage_path");

ALTER TABLE "receipt_document"
ADD CONSTRAINT "receipt_document_payroll_detail_fkey"
FOREIGN KEY ("payroll_detail_id") REFERENCES "payroll_details"("id") ON DELETE RESTRICT;

ALTER TABLE "receipt_document"
ADD CONSTRAINT "receipt_document_cfdi_fkey"
FOREIGN KEY ("cfdi_id") REFERENCES "cfdi_nominas"("id") ON DELETE SET NULL;
