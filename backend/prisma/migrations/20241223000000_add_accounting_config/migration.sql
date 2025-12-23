-- CreateEnum
CREATE TYPE "LiquidationType" AS ENUM ('FINIQUITO', 'LIQUIDACION', 'RESCISION', 'JUBILACION', 'MUERTE');

-- CreateEnum
CREATE TYPE "LiquidationStatus" AS ENUM ('DRAFT', 'CALCULATED', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "state_isn_configs" (
    "id" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "state_name" TEXT NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "threshold" DECIMAL(14,2),
    "exemptions" JSONB,
    "notes" TEXT,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "state_isn_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_values" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "uma_daily" DECIMAL(10,4) NOT NULL,
    "uma_monthly" DECIMAL(12,4) NOT NULL,
    "uma_yearly" DECIMAL(14,4) NOT NULL,
    "smg_daily" DECIMAL(10,4) NOT NULL,
    "smg_zfn_daily" DECIMAL(10,4),
    "aguinaldo_days" INTEGER NOT NULL DEFAULT 15,
    "vacation_premium_percent" DECIMAL(5,4) NOT NULL DEFAULT 0.25,
    "ptu_deadline" DATE,
    "isr_table_version" TEXT,
    "effective_from" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_payroll_configs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "default_period_type" "PeriodType" NOT NULL DEFAULT 'BIWEEKLY',
    "pay_day_of_week" INTEGER,
    "pay_day_of_month" INTEGER,
    "state_code" TEXT,
    "apply_isn" BOOLEAN NOT NULL DEFAULT true,
    "aguinaldo_days" INTEGER NOT NULL DEFAULT 15,
    "aguinaldo_pay_month" INTEGER NOT NULL DEFAULT 12,
    "aguinaldo_pay_day" INTEGER NOT NULL DEFAULT 20,
    "vacation_premium_percent" DECIMAL(5,4) NOT NULL DEFAULT 0.25,
    "apply_ptu" BOOLEAN NOT NULL DEFAULT true,
    "ptu_percent" DECIMAL(5,4) NOT NULL DEFAULT 0.10,
    "ptu_pay_month" INTEGER NOT NULL DEFAULT 5,
    "ptu_pay_day" INTEGER NOT NULL DEFAULT 30,
    "savings_fund_enabled" BOOLEAN NOT NULL DEFAULT false,
    "savings_fund_employee_percent" DECIMAL(5,4),
    "savings_fund_company_percent" DECIMAL(5,4),
    "savings_fund_max_percent" DECIMAL(5,4) DEFAULT 0.13,
    "savings_box_enabled" BOOLEAN NOT NULL DEFAULT false,
    "savings_box_employee_percent" DECIMAL(5,4),
    "food_vouchers_enabled" BOOLEAN NOT NULL DEFAULT false,
    "food_vouchers_percent" DECIMAL(5,4),
    "food_vouchers_max_uma" DECIMAL(5,2),
    "overtime_double_after" INTEGER NOT NULL DEFAULT 9,
    "overtime_triple_after" INTEGER NOT NULL DEFAULT 3,
    "max_overtime_hours_week" INTEGER NOT NULL DEFAULT 9,
    "apply_subsidio_empleo" BOOLEAN NOT NULL DEFAULT true,
    "rounding_method" TEXT NOT NULL DEFAULT 'ROUND',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_payroll_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_payroll_concepts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "concept_id" TEXT NOT NULL,
    "custom_name" TEXT,
    "custom_code" TEXT,
    "default_amount" DECIMAL(12,2),
    "formula" TEXT,
    "applies_to" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_payroll_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidation_calculations" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "type" "LiquidationType" NOT NULL,
    "termination_date" DATE NOT NULL,
    "termination_reason" TEXT,
    "daily_salary" DECIMAL(12,4) NOT NULL,
    "integrated_salary" DECIMAL(12,4) NOT NULL,
    "years_of_service" DECIMAL(5,2) NOT NULL,
    "pending_salary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "proportional_aguinaldo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "proportional_vacation" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vacation_premium" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "indemnization_90_days" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "indemnization_20_days" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "seniority_premium" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pending_loans" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pending_infonavit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "other_deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "isr_retention" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gross_total" DECIMAL(14,2) NOT NULL,
    "total_deductions" DECIMAL(14,2) NOT NULL,
    "net_total" DECIMAL(14,2) NOT NULL,
    "status" "LiquidationStatus" NOT NULL DEFAULT 'DRAFT',
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "calculation_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidation_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subsidio_empleo_tables" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "period_type" "PeriodType" NOT NULL,
    "lower_limit" DECIMAL(14,2) NOT NULL,
    "upper_limit" DECIMAL(14,2) NOT NULL,
    "subsidy_amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subsidio_empleo_tables_pkey" PRIMARY KEY ("id")
);

-- Drop old tables if they exist and recreate with new structure
DROP TABLE IF EXISTS "isr_tables";
DROP TABLE IF EXISTS "subsidio_tables";

-- CreateTable for ISR with new structure
CREATE TABLE "isr_tables" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "period_type" "PeriodType" NOT NULL,
    "lower_limit" DECIMAL(14,2) NOT NULL,
    "upper_limit" DECIMAL(14,2) NOT NULL,
    "fixed_fee" DECIMAL(14,2) NOT NULL,
    "rate_on_excess" DECIMAL(5,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "isr_tables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "state_isn_configs_state_code_key" ON "state_isn_configs"("state_code");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_values_year_key" ON "fiscal_values"("year");

-- CreateIndex
CREATE UNIQUE INDEX "company_payroll_configs_company_id_key" ON "company_payroll_configs"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_payroll_concepts_company_id_concept_id_key" ON "company_payroll_concepts"("company_id", "concept_id");

-- CreateIndex
CREATE UNIQUE INDEX "isr_tables_year_period_type_lower_limit_key" ON "isr_tables"("year", "period_type", "lower_limit");

-- CreateIndex
CREATE UNIQUE INDEX "subsidio_empleo_tables_year_period_type_lower_limit_key" ON "subsidio_empleo_tables"("year", "period_type", "lower_limit");

-- AddForeignKey
ALTER TABLE "company_payroll_configs" ADD CONSTRAINT "company_payroll_configs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_payroll_concepts" ADD CONSTRAINT "company_payroll_concepts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_payroll_concepts" ADD CONSTRAINT "company_payroll_concepts_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "payroll_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidation_calculations" ADD CONSTRAINT "liquidation_calculations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
