-- Add updatedAt to SubsidioEmpleoTable
ALTER TABLE "subsidio_empleo_tables" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Auditoría de cálculos de nómina
CREATE TABLE "payroll_calculation_audits" (
    "id" TEXT NOT NULL,
    "payroll_detail_id" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL,
    "calculated_by" TEXT,
    "perception_breakdown" JSONB NOT NULL,
    "deduction_breakdown" JSONB NOT NULL,
    "config_snapshot" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_calculation_audits_pkey" PRIMARY KEY ("id")
);

-- Auditoría de recálculos
CREATE TABLE "recalculation_audits" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payroll_period_id" TEXT,
    "payroll_detail_id" TEXT,
    "reason" TEXT NOT NULL,
    "recalculated_by" TEXT NOT NULL,
    "recalculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previous_state" JSONB NOT NULL,
    "new_state" JSONB NOT NULL,
    "differences" JSONB NOT NULL,
    "reverted_at" TIMESTAMP(3),
    "reverted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recalculation_audits_pkey" PRIMARY KEY ("id")
);

-- Configuración de nóminas especiales por empresa
CREATE TABLE "company_special_payroll_configs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "aguinaldo_days" INTEGER NOT NULL DEFAULT 15,
    "aguinaldo_default_payment_month" INTEGER NOT NULL DEFAULT 12,
    "aguinaldo_default_payment_day" INTEGER NOT NULL DEFAULT 20,
    "aguinaldo_include_variable" BOOLEAN NOT NULL DEFAULT false,
    "ptu_enabled" BOOLEAN NOT NULL DEFAULT true,
    "ptu_default_payment_month" INTEGER NOT NULL DEFAULT 5,
    "ptu_max_salary_multiplier" DECIMAL(5,2),
    "bonus_templates" JSONB,
    "liquidation_seniority_premium" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "liquidation_3months_constitutional" BOOLEAN NOT NULL DEFAULT true,
    "liquidation_20days_per_year" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_special_payroll_configs_pkey" PRIMARY KEY ("id")
);

-- Historial de nóminas especiales
CREATE TABLE "special_payroll_history" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" "ExtraordinaryType" NOT NULL,
    "year" INTEGER NOT NULL,
    "period_id" TEXT,
    "total_employees" INTEGER NOT NULL,
    "total_gross" DECIMAL(14,2) NOT NULL,
    "total_exempt" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_taxable" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_isr" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(14,2) NOT NULL,
    "config_snapshot" JSONB NOT NULL,
    "calculation_summary" JSONB NOT NULL,
    "employee_details" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "payment_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,

    CONSTRAINT "special_payroll_history_pkey" PRIMARY KEY ("id")
);

-- Fórmulas personalizadas de cálculo por empresa
CREATE TABLE "company_calculation_formulas" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "concept_code" TEXT NOT NULL,
    "concept_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formula" TEXT NOT NULL,
    "available_variables" JSONB NOT NULL DEFAULT '[]',
    "is_taxable" BOOLEAN NOT NULL DEFAULT true,
    "is_exempt" BOOLEAN NOT NULL DEFAULT false,
    "exempt_limit" DECIMAL(14,2),
    "exempt_limit_type" TEXT,
    "sat_concept_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_calculation_formulas_pkey" PRIMARY KEY ("id")
);

-- Índices únicos
CREATE UNIQUE INDEX "company_special_payroll_configs_company_id_key" ON "company_special_payroll_configs"("company_id");
CREATE UNIQUE INDEX "company_calculation_formulas_company_id_concept_code_key" ON "company_calculation_formulas"("company_id", "concept_code");

-- Foreign Keys
ALTER TABLE "payroll_calculation_audits" ADD CONSTRAINT "payroll_calculation_audits_payroll_detail_id_fkey" FOREIGN KEY ("payroll_detail_id") REFERENCES "payroll_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_special_payroll_configs" ADD CONSTRAINT "company_special_payroll_configs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "special_payroll_history" ADD CONSTRAINT "special_payroll_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_calculation_formulas" ADD CONSTRAINT "company_calculation_formulas_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
