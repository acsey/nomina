-- Migration: Tablas de configuración fiscal parametrizable
-- Fecha: 2025-12-30
-- Descripción: Agrega tablas para tasas de riesgo de trabajo y mapeo de conceptos de incidencias

-- ============================================
-- Tabla de tasas de riesgo de trabajo IMSS
-- ============================================
CREATE TABLE IF NOT EXISTS "work_risk_rates" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "risk_class" TEXT NOT NULL,
    "rate" DECIMAL(10,7) NOT NULL,
    "min_rate" DECIMAL(10,7),
    "max_rate" DECIMAL(10,7),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_risk_rates_pkey" PRIMARY KEY ("id")
);

-- Índice único para año + clase de riesgo
CREATE UNIQUE INDEX IF NOT EXISTS "work_risk_rates_year_risk_class_key" ON "work_risk_rates"("year", "risk_class");

-- ============================================
-- Tabla de mapeo de conceptos de incidencias
-- ============================================
CREATE TABLE IF NOT EXISTS "incident_concept_mappings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "incident_type_id" TEXT NOT NULL,
    "concept_id" TEXT NOT NULL,
    "is_retroactive" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_concept_mappings_pkey" PRIMARY KEY ("id")
);

-- Índice único para empresa + tipo de incidencia + retroactivo
CREATE UNIQUE INDEX IF NOT EXISTS "incident_concept_mappings_company_id_incident_type_id_is_retro_key"
ON "incident_concept_mappings"("company_id", "incident_type_id", "is_retroactive");

-- Relaciones
ALTER TABLE "incident_concept_mappings"
ADD CONSTRAINT "incident_concept_mappings_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incident_concept_mappings"
ADD CONSTRAINT "incident_concept_mappings_incident_type_id_fkey"
FOREIGN KEY ("incident_type_id") REFERENCES "incident_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "incident_concept_mappings"
ADD CONSTRAINT "incident_concept_mappings_concept_id_fkey"
FOREIGN KEY ("concept_id") REFERENCES "payroll_concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Insertar tasas de riesgo de trabajo 2025
-- ============================================
INSERT INTO "work_risk_rates" ("id", "year", "risk_class", "rate", "min_rate", "max_rate", "description", "is_active", "created_at", "updated_at")
VALUES
    (gen_random_uuid()::text, 2025, 'CLASE_I', 0.0054355, 0.0050000, 0.0058750, 'Clase I - Riesgo Mínimo', true, NOW(), NOW()),
    (gen_random_uuid()::text, 2025, 'CLASE_II', 0.0113065, 0.0106875, 0.0119375, 'Clase II - Riesgo Bajo', true, NOW(), NOW()),
    (gen_random_uuid()::text, 2025, 'CLASE_III', 0.0259840, 0.0253125, 0.0266875, 'Clase III - Riesgo Medio', true, NOW(), NOW()),
    (gen_random_uuid()::text, 2025, 'CLASE_IV', 0.0465325, 0.0458125, 0.0472500, 'Clase IV - Riesgo Alto', true, NOW(), NOW()),
    (gen_random_uuid()::text, 2025, 'CLASE_V', 0.0758875, 0.0750000, 0.0768750, 'Clase V - Riesgo Máximo', true, NOW(), NOW());

-- Insertar tasas de riesgo de trabajo 2024 (históricas)
INSERT INTO "work_risk_rates" ("id", "year", "risk_class", "rate", "min_rate", "max_rate", "description", "is_active", "created_at", "updated_at")
VALUES
    (gen_random_uuid()::text, 2024, 'CLASE_I', 0.0054355, 0.0050000, 0.0058750, 'Clase I - Riesgo Mínimo', true, NOW(), NOW()),
    (gen_random_uuid()::text, 2024, 'CLASE_II', 0.0113065, 0.0106875, 0.0119375, 'Clase II - Riesgo Bajo', true, NOW(), NOW()),
    (gen_random_uuid()::text, 2024, 'CLASE_III', 0.0259840, 0.0253125, 0.0266875, 'Clase III - Riesgo Medio', true, NOW(), NOW()),
    (gen_random_uuid()::text, 2024, 'CLASE_IV', 0.0465325, 0.0458125, 0.0472500, 'Clase IV - Riesgo Alto', true, NOW(), NOW()),
    (gen_random_uuid()::text, 2024, 'CLASE_V', 0.0758875, 0.0750000, 0.0768750, 'Clase V - Riesgo Máximo', true, NOW(), NOW());

-- ============================================
-- Insertar valores fiscales 2025 (si no existen)
-- ============================================
INSERT INTO "fiscal_values" (
    "id", "year", "uma_daily", "uma_monthly", "uma_yearly",
    "smg_daily", "smg_zfn_daily", "aguinaldo_days", "vacation_premium_percent",
    "effective_from", "notes", "created_at", "updated_at"
)
SELECT
    gen_random_uuid()::text, 2025, 113.14, 3439.46, 41273.52,
    278.80, 419.88, 15, 0.25,
    '2025-02-01', 'Valores fiscales 2025 (UMA publicada DOF 10-ene-2025)', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "fiscal_values" WHERE "year" = 2025);

-- ============================================
-- Insertar valores fiscales 2024 (si no existen)
-- ============================================
INSERT INTO "fiscal_values" (
    "id", "year", "uma_daily", "uma_monthly", "uma_yearly",
    "smg_daily", "smg_zfn_daily", "aguinaldo_days", "vacation_premium_percent",
    "effective_from", "notes", "created_at", "updated_at"
)
SELECT
    gen_random_uuid()::text, 2024, 108.57, 3300.53, 39632.66,
    248.93, 374.89, 15, 0.25,
    '2024-02-01', 'Valores fiscales 2024', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "fiscal_values" WHERE "year" = 2024);

-- ============================================
-- Insertar mapeos de conceptos por defecto (globales)
-- ============================================
-- Nota: Los mapeos globales tienen company_id = NULL

-- Mapeo para horas extra -> P002
INSERT INTO "incident_concept_mappings" ("id", "company_id", "incident_type_id", "concept_id", "is_retroactive", "priority", "is_active", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    NULL,
    it.id,
    pc.id,
    false,
    0,
    true,
    NOW(),
    NOW()
FROM "incident_types" it
CROSS JOIN "payroll_concepts" pc
WHERE it.code = 'OVERTIME' AND pc.code = 'P002'
AND NOT EXISTS (
    SELECT 1 FROM "incident_concept_mappings" icm
    WHERE icm.incident_type_id = it.id AND icm.company_id IS NULL AND icm.is_retroactive = false
);

-- Mapeo para faltas -> D010
INSERT INTO "incident_concept_mappings" ("id", "company_id", "incident_type_id", "concept_id", "is_retroactive", "priority", "is_active", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    NULL,
    it.id,
    pc.id,
    false,
    0,
    true,
    NOW(),
    NOW()
FROM "incident_types" it
CROSS JOIN "payroll_concepts" pc
WHERE it.code = 'ABSENCE' AND pc.code = 'D010'
AND NOT EXISTS (
    SELECT 1 FROM "incident_concept_mappings" icm
    WHERE icm.incident_type_id = it.id AND icm.company_id IS NULL AND icm.is_retroactive = false
);

-- Mapeo para retardos -> D011
INSERT INTO "incident_concept_mappings" ("id", "company_id", "incident_type_id", "concept_id", "is_retroactive", "priority", "is_active", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    NULL,
    it.id,
    pc.id,
    false,
    0,
    true,
    NOW(),
    NOW()
FROM "incident_types" it
CROSS JOIN "payroll_concepts" pc
WHERE it.code = 'TARDINESS' AND pc.code = 'D011'
AND NOT EXISTS (
    SELECT 1 FROM "incident_concept_mappings" icm
    WHERE icm.incident_type_id = it.id AND icm.company_id IS NULL AND icm.is_retroactive = false
);
