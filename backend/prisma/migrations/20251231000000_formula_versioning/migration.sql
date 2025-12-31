-- ============================================
-- MEJORA: Versionado de Fórmulas por Ejercicio Fiscal
-- ============================================

-- Agregar campos de vigencia a fórmulas
ALTER TABLE "company_calculation_formulas"
ADD COLUMN IF NOT EXISTS "fiscal_year" INTEGER,
ADD COLUMN IF NOT EXISTS "valid_from" DATE,
ADD COLUMN IF NOT EXISTS "valid_to" DATE,
ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1;

-- Agregar referencia a fórmula usada en versiones de recibo
ALTER TABLE "payroll_detail_versions"
ADD COLUMN IF NOT EXISTS "formulas_snapshot" JSONB,
ADD COLUMN IF NOT EXISTS "fiscal_config_snapshot" JSONB;

-- Agregar referencia a fórmula en percepciones
ALTER TABLE "payroll_perceptions"
ADD COLUMN IF NOT EXISTS "formula_id" TEXT,
ADD COLUMN IF NOT EXISTS "formula_version" INTEGER;

-- Agregar referencia a fórmula en deducciones
ALTER TABLE "payroll_deductions"
ADD COLUMN IF NOT EXISTS "formula_id" TEXT,
ADD COLUMN IF NOT EXISTS "formula_version" INTEGER;

-- Crear índice para búsqueda de fórmulas activas por año fiscal
CREATE INDEX IF NOT EXISTS "idx_formulas_fiscal_year_active"
ON "company_calculation_formulas" ("company_id", "fiscal_year", "is_active");

-- Crear índice para validación de traslapes de vigencia
CREATE INDEX IF NOT EXISTS "idx_formulas_validity_range"
ON "company_calculation_formulas" ("company_id", "concept_code", "valid_from", "valid_to");

-- ============================================
-- MEJORA: Auditoría de Cálculos Fiscales por Concepto
-- ============================================

CREATE TABLE IF NOT EXISTS "fiscal_calculation_audit" (
    "id" TEXT NOT NULL,
    "payroll_detail_id" TEXT NOT NULL,
    "concept_type" TEXT NOT NULL, -- ISR, IMSS_EMPLOYEE, IMSS_EMPLOYER, SUBSIDIO, etc.
    "concept_code" TEXT NOT NULL,

    -- Valores de entrada
    "input_values" JSONB NOT NULL,

    -- Regla/tabla aplicada
    "rule_applied" TEXT,
    "rule_version" TEXT,
    "table_used" TEXT,

    -- Base de cálculo
    "calculation_base" DECIMAL(14, 2) NOT NULL,

    -- Resultado desglosado
    "limit_inferior" DECIMAL(14, 2),
    "excedente" DECIMAL(14, 2),
    "impuesto_marginal" DECIMAL(14, 2),
    "cuota_fija" DECIMAL(14, 2),
    "result_amount" DECIMAL(14, 2) NOT NULL,

    -- Metadata
    "fiscal_year" INTEGER NOT NULL,
    "period_type" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculated_by" TEXT,

    CONSTRAINT "fiscal_calculation_audit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_fiscal_audit_detail"
ON "fiscal_calculation_audit" ("payroll_detail_id");

CREATE INDEX IF NOT EXISTS "idx_fiscal_audit_concept"
ON "fiscal_calculation_audit" ("concept_type", "concept_code");

CREATE INDEX IF NOT EXISTS "idx_fiscal_audit_year"
ON "fiscal_calculation_audit" ("fiscal_year");

-- Foreign key a PayrollDetail
ALTER TABLE "fiscal_calculation_audit"
ADD CONSTRAINT "fiscal_calculation_audit_payroll_detail_fkey"
FOREIGN KEY ("payroll_detail_id") REFERENCES "payroll_details"("id") ON DELETE RESTRICT;

-- ============================================
-- MEJORA: Registro de Errores de Timbrado con Clasificación
-- ============================================

ALTER TABLE "cfdi_nominas"
ADD COLUMN IF NOT EXISTS "error_code" TEXT,
ADD COLUMN IF NOT EXISTS "error_type" TEXT, -- TEMPORARY, PERMANENT, VALIDATION
ADD COLUMN IF NOT EXISTS "retry_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "last_retry_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "next_retry_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "idx_cfdi_retry_status"
ON "cfdi_nominas" ("status", "error_type", "next_retry_at");
