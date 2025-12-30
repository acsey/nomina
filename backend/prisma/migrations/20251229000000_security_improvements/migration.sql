-- Migración: Mejoras de Seguridad y Compliance
-- Cumple con: Documento de Requerimientos - Plataforma Integral de Nómina (México)
-- Secciones: 5. Base de Datos, 6. Seguridad, 7. Auditoría

-- =============================================
-- ÍNDICES OPTIMIZADOS
-- Sección 5: Indexar RFC, UUID CFDI, empresa + periodo
-- =============================================

-- Índices para búsqueda rápida por RFC (empleados y empresas)
CREATE INDEX IF NOT EXISTS "idx_employees_rfc" ON "employees" ("rfc");
CREATE INDEX IF NOT EXISTS "idx_employees_curp" ON "employees" ("curp");
CREATE INDEX IF NOT EXISTS "idx_companies_rfc" ON "companies" ("rfc");

-- Índices para CFDI - búsqueda por UUID y estado
CREATE INDEX IF NOT EXISTS "idx_cfdi_nominas_uuid" ON "cfdi_nominas" ("uuid");
CREATE INDEX IF NOT EXISTS "idx_cfdi_nominas_status" ON "cfdi_nominas" ("status");
CREATE INDEX IF NOT EXISTS "idx_cfdi_nominas_employee_id" ON "cfdi_nominas" ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_cfdi_nominas_fecha_timbrado" ON "cfdi_nominas" ("fecha_timbrado");

-- Índices compuestos para consultas frecuentes de nómina
CREATE INDEX IF NOT EXISTS "idx_payroll_periods_company_year" ON "payroll_periods" ("company_id", "year");
CREATE INDEX IF NOT EXISTS "idx_payroll_periods_company_type_status" ON "payroll_periods" ("company_id", "period_type", "status");
CREATE INDEX IF NOT EXISTS "idx_payroll_details_period_employee" ON "payroll_details" ("payroll_period_id", "employee_id");
CREATE INDEX IF NOT EXISTS "idx_payroll_details_status" ON "payroll_details" ("status");

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_entity_id" ON "audit_logs" ("entity", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id_created_at" ON "audit_logs" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("created_at");

-- Índices para empleados por empresa y departamento
CREATE INDEX IF NOT EXISTS "idx_employees_company_id" ON "employees" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_employees_department_id" ON "employees" ("department_id");
CREATE INDEX IF NOT EXISTS "idx_employees_status" ON "employees" ("status");
CREATE INDEX IF NOT EXISTS "idx_employees_company_status" ON "employees" ("company_id", "status");

-- Índices para incidencias
CREATE INDEX IF NOT EXISTS "idx_employee_incidents_employee_date" ON "employee_incidents" ("employee_id", "date");
CREATE INDEX IF NOT EXISTS "idx_employee_incidents_status" ON "employee_incidents" ("status");
CREATE INDEX IF NOT EXISTS "idx_employee_incidents_payroll_period" ON "employee_incidents" ("payroll_period_id");

-- Índices para tablas fiscales
CREATE INDEX IF NOT EXISTS "idx_isr_tables_year_period" ON "isr_tables" ("year", "period_type");
CREATE INDEX IF NOT EXISTS "idx_subsidio_empleo_year_period" ON "subsidio_empleo_tables" ("year", "period_type");

-- =============================================
-- TABLA DE AUDITORÍA DE ACCESO A SECRETOS
-- Sección 6: Auditoría de accesos y acciones críticas
-- =============================================

CREATE TABLE IF NOT EXISTS "secret_access_logs" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "secret_type" VARCHAR(50) NOT NULL, -- 'CERTIFICATE', 'PAC_CREDENTIALS'
    "purpose" VARCHAR(255) NOT NULL, -- 'STAMP_CFDI', 'CANCEL_CFDI', 'MIGRATION'
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_secret_access_logs_user_company" ON "secret_access_logs" ("user_id", "company_id");
CREATE INDEX IF NOT EXISTS "idx_secret_access_logs_created_at" ON "secret_access_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_secret_access_logs_secret_type" ON "secret_access_logs" ("secret_type");

-- =============================================
-- TABLA DE VERSIONES DE RECIBOS
-- Sección 5: Implementar versionado de recibos
-- =============================================

CREATE TABLE IF NOT EXISTS "payroll_detail_versions" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "payroll_detail_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    -- Snapshot de datos al momento del versionado
    "worked_days" DECIMAL(5,2) NOT NULL,
    "total_perceptions" DECIMAL(12,2) NOT NULL,
    "total_deductions" DECIMAL(12,2) NOT NULL,
    "net_pay" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL,

    -- Detalle completo en JSON
    "perceptions_snapshot" JSONB NOT NULL,
    "deductions_snapshot" JSONB NOT NULL,
    "calculation_config" JSONB, -- Configuración fiscal usada

    -- Metadata
    "created_by" VARCHAR(255),
    "created_reason" TEXT, -- 'INITIAL', 'RECALCULATION', 'CORRECTION'
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Referencia al CFDI si existe
    "cfdi_uuid" VARCHAR(36),
    "cfdi_status" VARCHAR(50),

    CONSTRAINT "fk_payroll_detail_versions_detail"
        FOREIGN KEY ("payroll_detail_id")
        REFERENCES "payroll_details" ("id")
        ON DELETE RESTRICT -- Prohibir eliminación si tiene versiones
);

CREATE INDEX IF NOT EXISTS "idx_payroll_detail_versions_detail" ON "payroll_detail_versions" ("payroll_detail_id");
CREATE INDEX IF NOT EXISTS "idx_payroll_detail_versions_version" ON "payroll_detail_versions" ("payroll_detail_id", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_payroll_detail_versions_unique" ON "payroll_detail_versions" ("payroll_detail_id", "version");

-- =============================================
-- RESTRICCIONES DE INTEGRIDAD FISCAL
-- Sección 5: Prohibido eliminar información fiscal
-- =============================================

-- Crear función para prevenir eliminación de CFDIs timbrados
CREATE OR REPLACE FUNCTION prevent_cfdi_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'STAMPED' THEN
        RAISE EXCEPTION 'No se puede eliminar un CFDI timbrado. UUID: %', OLD.uuid
            USING HINT = 'Los comprobantes fiscales son documentos legales inmutables';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger para prevenir eliminación de CFDIs timbrados
DROP TRIGGER IF EXISTS trg_prevent_cfdi_deletion ON "cfdi_nominas";
CREATE TRIGGER trg_prevent_cfdi_deletion
    BEFORE DELETE ON "cfdi_nominas"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_cfdi_deletion();

-- Crear función para prevenir modificación de CFDIs timbrados
CREATE OR REPLACE FUNCTION prevent_cfdi_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'STAMPED' THEN
        -- Solo permitir cambio a CANCELLED (cancelación)
        IF NEW.status = 'CANCELLED' AND
           OLD.uuid = NEW.uuid AND
           OLD.xml_timbrado = NEW.xml_timbrado THEN
            RETURN NEW;
        END IF;

        RAISE EXCEPTION 'No se puede modificar un CFDI timbrado. UUID: %', OLD.uuid
            USING HINT = 'Solo se permite la cancelación a través del proceso oficial';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para prevenir modificación de CFDIs timbrados
DROP TRIGGER IF EXISTS trg_prevent_cfdi_modification ON "cfdi_nominas";
CREATE TRIGGER trg_prevent_cfdi_modification
    BEFORE UPDATE ON "cfdi_nominas"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_cfdi_modification();

-- Crear función para prevenir eliminación de payroll_details con CFDI
CREATE OR REPLACE FUNCTION prevent_payroll_detail_deletion()
RETURNS TRIGGER AS $$
DECLARE
    cfdi_record RECORD;
BEGIN
    SELECT status, uuid INTO cfdi_record
    FROM "cfdi_nominas"
    WHERE payroll_detail_id = OLD.id;

    IF FOUND AND cfdi_record.status = 'STAMPED' THEN
        RAISE EXCEPTION 'No se puede eliminar un detalle de nómina con CFDI timbrado. UUID: %', cfdi_record.uuid
            USING HINT = 'La información fiscal debe permanecer inmutable';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger para prevenir eliminación de detalles de nómina con CFDI
DROP TRIGGER IF EXISTS trg_prevent_payroll_detail_deletion ON "payroll_details";
CREATE TRIGGER trg_prevent_payroll_detail_deletion
    BEFORE DELETE ON "payroll_details"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_payroll_detail_deletion();

-- =============================================
-- FUNCIÓN PARA AUTO-VERSIONAR RECIBOS
-- Sección 4: Ningún recálculo debe sobrescribir información previa
-- =============================================

CREATE OR REPLACE FUNCTION create_payroll_detail_version()
RETURNS TRIGGER AS $$
DECLARE
    next_version INTEGER;
    perceptions_json JSONB;
    deductions_json JSONB;
    cfdi_data RECORD;
BEGIN
    -- Solo versionar si hay cambios significativos en montos
    IF OLD.total_perceptions = NEW.total_perceptions AND
       OLD.total_deductions = NEW.total_deductions AND
       OLD.net_pay = NEW.net_pay THEN
        RETURN NEW;
    END IF;

    -- Obtener siguiente versión
    SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
    FROM "payroll_detail_versions"
    WHERE payroll_detail_id = OLD.id;

    -- Obtener percepciones y deducciones actuales
    SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb) INTO perceptions_json
    FROM "payroll_perceptions" p
    WHERE p.payroll_detail_id = OLD.id;

    SELECT COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb) INTO deductions_json
    FROM "payroll_deductions" d
    WHERE d.payroll_detail_id = OLD.id;

    -- Obtener datos CFDI si existe
    SELECT uuid, status INTO cfdi_data
    FROM "cfdi_nominas"
    WHERE payroll_detail_id = OLD.id;

    -- Crear versión
    INSERT INTO "payroll_detail_versions" (
        payroll_detail_id,
        version,
        worked_days,
        total_perceptions,
        total_deductions,
        net_pay,
        status,
        perceptions_snapshot,
        deductions_snapshot,
        created_reason,
        cfdi_uuid,
        cfdi_status
    ) VALUES (
        OLD.id,
        next_version,
        OLD.worked_days,
        OLD.total_perceptions,
        OLD.total_deductions,
        OLD.net_pay,
        OLD.status,
        perceptions_json,
        deductions_json,
        'RECALCULATION',
        cfdi_data.uuid,
        cfdi_data.status
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-versionar al modificar
DROP TRIGGER IF EXISTS trg_version_payroll_detail ON "payroll_details";
CREATE TRIGGER trg_version_payroll_detail
    BEFORE UPDATE ON "payroll_details"
    FOR EACH ROW
    EXECUTE FUNCTION create_payroll_detail_version();

-- =============================================
-- CAMPOS ADICIONALES DE AUDITORÍA
-- =============================================

-- Agregar campos de auditoría a tablas críticas si no existen
DO $$
BEGIN
    -- Agregar columna de IP a audit_logs si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE "audit_logs" ADD COLUMN "user_agent" TEXT;
    END IF;

    -- Agregar columna de metadata a cfdi_nominas si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cfdi_nominas' AND column_name = 'audit_metadata'
    ) THEN
        ALTER TABLE "cfdi_nominas" ADD COLUMN "audit_metadata" JSONB;
    END IF;
END $$;

-- =============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =============================================

COMMENT ON TABLE "secret_access_logs" IS 'Registro de accesos a secretos cifrados (certificados, credenciales PAC). Requerimiento: Sección 6 - Auditoría de accesos';
COMMENT ON TABLE "payroll_detail_versions" IS 'Versiones históricas de detalles de nómina. Requerimiento: Sección 4 - Versionar recibos';
COMMENT ON FUNCTION prevent_cfdi_deletion() IS 'Previene eliminación de CFDIs timbrados. Requerimiento: Sección 5 - Recibos timbrados son inmutables';
COMMENT ON FUNCTION prevent_cfdi_modification() IS 'Previene modificación de CFDIs timbrados. Requerimiento: Sección 5 - Recibos timbrados son inmutables';
COMMENT ON FUNCTION create_payroll_detail_version() IS 'Auto-versiona recibos antes de modificaciones. Requerimiento: Sección 4 - Ningún recálculo debe sobrescribir información previa';
