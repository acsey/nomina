-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('ABSENCE', 'OVERTIME', 'TARDINESS', 'EARLY_LEAVE', 'BONUS', 'DEDUCTION', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentValueType" AS ENUM ('DAYS', 'HOURS', 'AMOUNT', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED');

-- CreateTable
CREATE TABLE "incident_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "IncidentCategory" NOT NULL,
    "affects_payroll" BOOLEAN NOT NULL DEFAULT true,
    "is_deduction" BOOLEAN NOT NULL DEFAULT false,
    "default_value" DECIMAL(12,2),
    "value_type" "IncidentValueType" NOT NULL DEFAULT 'DAYS',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_incidents" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "incident_type_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "document_path" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "payroll_period_id" TEXT,
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "incident_types_code_key" ON "incident_types"("code");

-- AddForeignKey
ALTER TABLE "employee_incidents" ADD CONSTRAINT "employee_incidents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_incidents" ADD CONSTRAINT "employee_incidents_incident_type_id_fkey" FOREIGN KEY ("incident_type_id") REFERENCES "incident_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert default incident types
INSERT INTO "incident_types" ("id", "code", "name", "description", "category", "affects_payroll", "is_deduction", "default_value", "value_type", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'FALTA', 'Falta Injustificada', 'Ausencia sin justificación', 'ABSENCE', true, true, 1, 'DAYS', true, NOW(), NOW()),
  (gen_random_uuid(), 'FALTA_JUST', 'Falta Justificada', 'Ausencia con justificación', 'ABSENCE', true, false, 1, 'DAYS', true, NOW(), NOW()),
  (gen_random_uuid(), 'RETARDO', 'Retardo', 'Llegada tarde al trabajo', 'TARDINESS', true, true, 0.25, 'DAYS', true, NOW(), NOW()),
  (gen_random_uuid(), 'HORAS_EXTRA', 'Horas Extra', 'Tiempo extra trabajado', 'OVERTIME', true, false, 1, 'HOURS', true, NOW(), NOW()),
  (gen_random_uuid(), 'HORAS_EXTRA_DOBLES', 'Horas Extra Dobles', 'Tiempo extra al 100%', 'OVERTIME', true, false, 1, 'HOURS', true, NOW(), NOW()),
  (gen_random_uuid(), 'HORAS_EXTRA_TRIPLES', 'Horas Extra Triples', 'Tiempo extra al 200%', 'OVERTIME', true, false, 1, 'HOURS', true, NOW(), NOW()),
  (gen_random_uuid(), 'SALIDA_TEMPRANA', 'Salida Temprana', 'Salida antes de hora', 'EARLY_LEAVE', true, true, 0.5, 'DAYS', true, NOW(), NOW()),
  (gen_random_uuid(), 'BONO', 'Bono', 'Bono adicional', 'BONUS', true, false, 0, 'AMOUNT', true, NOW(), NOW()),
  (gen_random_uuid(), 'DESCUENTO', 'Descuento', 'Descuento por concepto varios', 'DEDUCTION', true, true, 0, 'AMOUNT', true, NOW(), NOW()),
  (gen_random_uuid(), 'INCAPACIDAD_IMSS', 'Incapacidad IMSS', 'Incapacidad por enfermedad general', 'ABSENCE', false, false, 1, 'DAYS', true, NOW(), NOW()),
  (gen_random_uuid(), 'PERMISO_SIN_GOCE', 'Permiso Sin Goce de Sueldo', 'Día de permiso sin pago', 'ABSENCE', true, true, 1, 'DAYS', true, NOW(), NOW()),
  (gen_random_uuid(), 'PERMISO_CON_GOCE', 'Permiso Con Goce de Sueldo', 'Día de permiso con pago', 'ABSENCE', false, false, 1, 'DAYS', true, NOW(), NOW());
