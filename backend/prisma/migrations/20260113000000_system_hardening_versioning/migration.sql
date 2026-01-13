-- ============================================
-- System Hardening Migration
-- Versionado de Recibos, Reglas Fiscales, Auditoría
-- ============================================

-- 1. Crear enum FiscalRuleType
CREATE TYPE "FiscalRuleType" AS ENUM (
  'ISR_ADJUSTMENT',
  'SUBSIDIO_ADJUSTMENT',
  'IMSS_OVERRIDE',
  'INFONAVIT_OVERRIDE',
  'PERCEPTION_CALCULATION',
  'DEDUCTION_CALCULATION',
  'EXEMPTION_RULE',
  'SPECIAL_TAX_TREATMENT',
  'REGIONAL_ADJUSTMENT',
  'CUSTOM'
);

-- 2. Añadir nuevos valores al enum PayrollDetailStatus
ALTER TYPE "PayrollDetailStatus" ADD VALUE IF NOT EXISTS 'STAMPING';
ALTER TYPE "PayrollDetailStatus" ADD VALUE IF NOT EXISTS 'STAMP_OK';
ALTER TYPE "PayrollDetailStatus" ADD VALUE IF NOT EXISTS 'STAMP_ERROR';
ALTER TYPE "PayrollDetailStatus" ADD VALUE IF NOT EXISTS 'SUPERSEDED';

-- 3. Añadir campos de versionado a PayrollDetail
ALTER TABLE "payroll_details"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "parent_receipt_id" TEXT,
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "superseded_at" TIMESTAMP(3);

-- 4. Crear índice único compuesto para versionado
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_details_period_employee_version_key"
  ON "payroll_details"("payroll_period_id", "employee_id", "version");

-- 5. Crear índice para búsqueda de recibo activo
CREATE INDEX IF NOT EXISTS "payroll_details_period_employee_active_idx"
  ON "payroll_details"("payroll_period_id", "employee_id", "active");

-- 6. Añadir FK para parent_receipt_id (auto-referencia)
ALTER TABLE "payroll_details"
  ADD CONSTRAINT "payroll_details_parent_receipt_id_fkey"
  FOREIGN KEY ("parent_receipt_id")
  REFERENCES "payroll_details"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Añadir campos de snapshot a FiscalCalculationAudit
ALTER TABLE "fiscal_calculation_audits"
  ADD COLUMN IF NOT EXISTS "input_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "output_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "applied_rules_snapshot" JSONB;

-- 8. Crear tabla FiscalRule
CREATE TABLE IF NOT EXISTS "fiscal_rules" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "rule_type" "FiscalRuleType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "start_date" DATE NOT NULL,
  "end_date" DATE,
  "logic_json" JSONB NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_by" TEXT,

  CONSTRAINT "fiscal_rules_pkey" PRIMARY KEY ("id")
);

-- 9. Crear índices para FiscalRule
CREATE INDEX IF NOT EXISTS "fiscal_rules_company_type_active_idx"
  ON "fiscal_rules"("company_id", "rule_type", "active");

CREATE INDEX IF NOT EXISTS "fiscal_rules_company_type_dates_idx"
  ON "fiscal_rules"("company_id", "rule_type", "start_date", "end_date");

-- 10. Añadir FK de FiscalRule a Company
ALTER TABLE "fiscal_rules"
  ADD CONSTRAINT "fiscal_rules_company_id_fkey"
  FOREIGN KEY ("company_id")
  REFERENCES "companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 11. Añadir FK de FiscalRule a User (created_by)
ALTER TABLE "fiscal_rules"
  ADD CONSTRAINT "fiscal_rules_created_by_fkey"
  FOREIGN KEY ("created_by")
  REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 12. Añadir campos de error de timbrado a PayrollDetail (si no existen)
ALTER TABLE "payroll_details"
  ADD COLUMN IF NOT EXISTS "stamping_error_code" TEXT,
  ADD COLUMN IF NOT EXISTS "stamping_error_message" TEXT,
  ADD COLUMN IF NOT EXISTS "stamping_attempts" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_stamping_attempt" TIMESTAMP(3);

-- 13. Añadir campo sha256_hash a documents (para CAS)
ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "sha256_hash" TEXT;

CREATE INDEX IF NOT EXISTS "documents_sha256_hash_idx"
  ON "documents"("sha256_hash");
