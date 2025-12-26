-- Add incident deadline to payroll periods
ALTER TABLE "payroll_periods" ADD COLUMN IF NOT EXISTS "incident_deadline" DATE;

-- Add retroactive fields to employee incidents
ALTER TABLE "employee_incidents" ADD COLUMN IF NOT EXISTS "is_retroactive" BOOLEAN DEFAULT false;
ALTER TABLE "employee_incidents" ADD COLUMN IF NOT EXISTS "retroactive_note" TEXT;

-- Add foreign key for payroll period relation (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employee_incidents_payroll_period_id_fkey'
  ) THEN
    ALTER TABLE "employee_incidents"
    ADD CONSTRAINT "employee_incidents_payroll_period_id_fkey"
    FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Add new payroll concepts for incidents
INSERT INTO "payroll_concepts" ("id", "code", "name", "type", "sat_code", "is_taxable", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'P010', 'Bono por Incidencia', 'PERCEPTION', '038', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'P011', 'Ajuste Período Anterior (Percepción)', 'PERCEPTION', '038', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'D010', 'Descuento por Falta', 'DEDUCTION', '004', false, true, NOW(), NOW()),
  (gen_random_uuid(), 'D011', 'Descuento por Retardo', 'DEDUCTION', '004', false, true, NOW(), NOW()),
  (gen_random_uuid(), 'D012', 'Ajuste Período Anterior (Deducción)', 'DEDUCTION', '004', false, true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;
