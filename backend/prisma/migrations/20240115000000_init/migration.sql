-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COHABITING');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('INDEFINITE', 'FIXED_TERM', 'SEASONAL', 'TRIAL_PERIOD', 'TRAINING');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'HOURLY');

-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY', 'HOURLY');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFER', 'CHECK', 'CASH');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "TipoSalarioIMSS" AS ENUM ('FIJO', 'VARIABLE', 'MIXTO');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('CLASE_I', 'CLASE_II', 'CLASE_III', 'CLASE_IV', 'CLASE_V');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INE', 'PASSPORT', 'CURP', 'RFC', 'NSS', 'PROOF_OF_ADDRESS', 'BIRTH_CERTIFICATE', 'DEGREE', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE', 'VACATION', 'SICK_LEAVE', 'PERMIT', 'HOLIDAY', 'REST_DAY');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('VACATION', 'SICK_LEAVE', 'SICK_LEAVE_IMSS', 'WORK_ACCIDENT', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT_DIRECT', 'BEREAVEMENT_INDIRECT', 'PERSONAL', 'UNPAID', 'MEDICAL_APPOINTMENT', 'GOVERNMENT_PROCEDURE', 'STUDY_PERMIT', 'OTHER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'EXTRAORDINARY');

-- CreateEnum
CREATE TYPE "ExtraordinaryType" AS ENUM ('AGUINALDO', 'VACATION_PREMIUM', 'PTU', 'SETTLEMENT', 'LIQUIDATION', 'BONUS', 'RETROACTIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PROCESSING', 'CALCULATED', 'APPROVED', 'PAID', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollDetailStatus" AS ENUM ('PENDING', 'CALCULATED', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConceptType" AS ENUM ('PERCEPTION', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "SalaryBaseType" AS ENUM ('SBC', 'SMG', 'UMA', 'FIXED');

-- CreateEnum
CREATE TYPE "InfonavitDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'VSM');

-- CreateEnum
CREATE TYPE "PensionDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "CfdiStatus" AS ENUM ('PENDING', 'STAMPED', 'CANCELLED', 'ERROR');

-- CreateEnum
CREATE TYPE "BenefitType" AS ENUM ('FOOD_VOUCHERS', 'SAVINGS_FUND', 'BONUS', 'LIFE_INSURANCE', 'MAJOR_MEDICAL', 'PRODUCTIVITY_BONUS', 'ATTENDANCE_BONUS', 'PUNCTUALITY_BONUS', 'TRANSPORTATION', 'OTHER');

-- CreateEnum
CREATE TYPE "BenefitValueType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE_SALARY', 'DAYS_SALARY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "registro_patronal" TEXT,
    "registro_patronal_issste" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "company_id" TEXT NOT NULL,
    "manager_id" TEXT,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employee_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT NOT NULL,
    "second_last_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "marital_status" "MaritalStatus" NOT NULL,
    "rfc" TEXT NOT NULL,
    "curp" TEXT NOT NULL,
    "nss" TEXT,
    "issste_number" TEXT,
    "infonavit_number" TEXT,
    "address" TEXT,
    "colony" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,
    "hire_date" TIMESTAMP(3) NOT NULL,
    "termination_date" TIMESTAMP(3),
    "contract_type" "ContractType" NOT NULL,
    "employment_type" "EmploymentType" NOT NULL,
    "job_position_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "work_schedule_id" TEXT,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "salary_type" "SalaryType" NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "bank_id" TEXT,
    "bank_account" TEXT,
    "clabe" TEXT,
    "salario_diario_integrado" DECIMAL(12,2),
    "tipo_salario_imss" "TipoSalarioIMSS",
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_positions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "min_salary" DECIMAL(12,2),
    "max_salary" DECIMAL(12,2),
    "risk_level" "RiskLevel" NOT NULL DEFAULT 'CLASE_I',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_history" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "old_salary" DECIMAL(12,2) NOT NULL,
    "new_salary" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedule_details" (
    "id" TEXT NOT NULL,
    "work_schedule_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "break_start" TEXT,
    "break_end" TEXT,
    "is_work_day" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "work_schedule_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "break_start" TIMESTAMP(3),
    "break_end" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "hours_worked" DECIMAL(5,2),
    "overtime" DECIMAL(5,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "is_national" BOOLEAN NOT NULL DEFAULT true,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacation_requests" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_days" INTEGER NOT NULL,
    "reason" TEXT,
    "document_path" TEXT,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_type_configs" (
    "id" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "max_days" INTEGER NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "requires_document" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leave_type_configs_type_key" ON "leave_type_configs"("type");

-- CreateTable
CREATE TABLE "vacation_balances" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "earned_days" INTEGER NOT NULL,
    "used_days" INTEGER NOT NULL DEFAULT 0,
    "pending_days" INTEGER NOT NULL DEFAULT 0,
    "expired_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "period_type" "PeriodType" NOT NULL,
    "extraordinary_type" "ExtraordinaryType",
    "period_number" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "payment_date" DATE NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "total_perceptions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_details" (
    "id" TEXT NOT NULL,
    "payroll_period_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "worked_days" DECIMAL(5,2) NOT NULL,
    "total_perceptions" DECIMAL(12,2) NOT NULL,
    "total_deductions" DECIMAL(12,2) NOT NULL,
    "net_pay" DECIMAL(12,2) NOT NULL,
    "status" "PayrollDetailStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_perceptions" (
    "id" TEXT NOT NULL,
    "payroll_detail_id" TEXT NOT NULL,
    "concept_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "taxable_amount" DECIMAL(12,2) NOT NULL,
    "exempt_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_perceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_deductions" (
    "id" TEXT NOT NULL,
    "payroll_detail_id" TEXT NOT NULL,
    "concept_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_concepts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ConceptType" NOT NULL,
    "sat_code" TEXT,
    "is_taxable" BOOLEAN NOT NULL DEFAULT false,
    "is_fixed" BOOLEAN NOT NULL DEFAULT false,
    "default_amount" DECIMAL(12,2),
    "formula" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "isr_tables" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "period_type" "PeriodType" NOT NULL,
    "lower_limit" DECIMAL(12,2) NOT NULL,
    "upper_limit" DECIMAL(12,2) NOT NULL,
    "fixed_fee" DECIMAL(12,2) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "isr_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subsidio_tables" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "period_type" "PeriodType" NOT NULL,
    "lower_limit" DECIMAL(12,2) NOT NULL,
    "upper_limit" DECIMAL(12,2) NOT NULL,
    "subsidy_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subsidio_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imss_rates" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "concept" TEXT NOT NULL,
    "employer_rate" DECIMAL(6,4) NOT NULL,
    "employee_rate" DECIMAL(6,4) NOT NULL,
    "salary_base" "SalaryBaseType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imss_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "infonavit_credits" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "credit_number" TEXT NOT NULL,
    "discount_type" "InfonavitDiscountType" NOT NULL,
    "discount_value" DECIMAL(12,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "infonavit_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pension_alimenticia" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "beneficiary_name" TEXT NOT NULL,
    "discount_type" "PensionDiscountType" NOT NULL,
    "discount_value" DECIMAL(12,2) NOT NULL,
    "court_order" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pension_alimenticia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cfdi_nominas" (
    "id" TEXT NOT NULL,
    "payroll_detail_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "uuid" TEXT,
    "serie" TEXT,
    "folio" TEXT,
    "fecha_timbrado" TIMESTAMP(3),
    "no_certificado_sat" TEXT,
    "no_certificado_emisor" TEXT,
    "xml_original" TEXT,
    "xml_timbrado" TEXT,
    "cadena_original" TEXT,
    "sello_digital_sat" TEXT,
    "sello_digital_emisor" TEXT,
    "pdf_path" TEXT,
    "status" "CfdiStatus" NOT NULL DEFAULT 'PENDING',
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "pac_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cfdi_nominas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "BenefitType" NOT NULL,
    "value" DECIMAL(12,2),
    "value_type" "BenefitValueType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_benefits" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "benefit_id" TEXT NOT NULL,
    "custom_value" DECIMAL(12,2),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_rfc_key" ON "companies"("rfc");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_number_key" ON "employees"("employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_rfc_key" ON "employees"("rfc");

-- CreateIndex
CREATE UNIQUE INDEX "employees_curp_key" ON "employees"("curp");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_employee_id_date_key" ON "attendance_records"("employee_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_year_key" ON "holidays"("date", "year");

-- CreateIndex
CREATE UNIQUE INDEX "vacation_balances_employee_id_year_key" ON "vacation_balances"("employee_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_company_id_period_type_period_number_year_key" ON "payroll_periods"("company_id", "period_type", "period_number", "year");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_details_payroll_period_id_employee_id_key" ON "payroll_details"("payroll_period_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_concepts_code_key" ON "payroll_concepts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "imss_rates_year_concept_key" ON "imss_rates"("year", "concept");

-- CreateIndex
CREATE UNIQUE INDEX "cfdi_nominas_payroll_detail_id_key" ON "cfdi_nominas"("payroll_detail_id");

-- CreateIndex
CREATE UNIQUE INDEX "cfdi_nominas_uuid_key" ON "cfdi_nominas"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "employee_benefits_employee_id_benefit_id_key" ON "employee_benefits"("employee_id", "benefit_id");

-- CreateIndex
CREATE UNIQUE INDEX "banks_code_key" ON "banks"("code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_job_position_id_fkey" FOREIGN KEY ("job_position_id") REFERENCES "job_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_work_schedule_id_fkey" FOREIGN KEY ("work_schedule_id") REFERENCES "work_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_history" ADD CONSTRAINT "salary_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedule_details" ADD CONSTRAINT "work_schedule_details_work_schedule_id_fkey" FOREIGN KEY ("work_schedule_id") REFERENCES "work_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_details" ADD CONSTRAINT "payroll_details_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_details" ADD CONSTRAINT "payroll_details_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_perceptions" ADD CONSTRAINT "payroll_perceptions_payroll_detail_id_fkey" FOREIGN KEY ("payroll_detail_id") REFERENCES "payroll_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_perceptions" ADD CONSTRAINT "payroll_perceptions_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "payroll_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_payroll_detail_id_fkey" FOREIGN KEY ("payroll_detail_id") REFERENCES "payroll_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "payroll_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infonavit_credits" ADD CONSTRAINT "infonavit_credits_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pension_alimenticia" ADD CONSTRAINT "pension_alimenticia_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cfdi_nominas" ADD CONSTRAINT "cfdi_nominas_payroll_detail_id_fkey" FOREIGN KEY ("payroll_detail_id") REFERENCES "payroll_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cfdi_nominas" ADD CONSTRAINT "cfdi_nominas_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_benefits" ADD CONSTRAINT "employee_benefits_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_benefits" ADD CONSTRAINT "employee_benefits_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "benefits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
