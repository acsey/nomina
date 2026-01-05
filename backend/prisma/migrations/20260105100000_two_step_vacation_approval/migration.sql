-- ============================================
-- MIGRACIÓN: Flujo de aprobación de dos pasos para vacaciones
-- Fecha: 2026-01-05
-- Objetivo: Implementar Empleado → Supervisor → RH
-- ============================================

-- 1. Agregar nuevo valor al enum RequestStatus
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'SUPERVISOR_APPROVED';

-- 2. Agregar campos para aprobación del supervisor (Paso 1)
ALTER TABLE "vacation_requests"
ADD COLUMN IF NOT EXISTS "supervisor_approved_by_id" TEXT,
ADD COLUMN IF NOT EXISTS "supervisor_approved_at" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "supervisor_comments" TEXT;

-- 3. Agregar campos para comentarios de RH
ALTER TABLE "vacation_requests"
ADD COLUMN IF NOT EXISTS "rh_comments" TEXT;

-- 4. Agregar campos para tracking de rechazo
ALTER TABLE "vacation_requests"
ADD COLUMN IF NOT EXISTS "rejected_by_id" TEXT,
ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "rejected_stage" TEXT;

-- 5. Agregar foreign keys
ALTER TABLE "vacation_requests"
ADD CONSTRAINT "vacation_requests_supervisor_approved_by_id_fkey"
FOREIGN KEY ("supervisor_approved_by_id")
REFERENCES "employees"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vacation_requests"
ADD CONSTRAINT "vacation_requests_rejected_by_id_fkey"
FOREIGN KEY ("rejected_by_id")
REFERENCES "employees"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Índices para búsqueda
CREATE INDEX IF NOT EXISTS "idx_vacation_requests_status" ON "vacation_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_vacation_requests_supervisor_approved" ON "vacation_requests"("supervisor_approved_by_id");
CREATE INDEX IF NOT EXISTS "idx_vacation_requests_rejected" ON "vacation_requests"("rejected_by_id");

-- 7. Comentarios
COMMENT ON COLUMN "vacation_requests"."supervisor_approved_by_id" IS 'ID del supervisor que aprobó (Paso 1)';
COMMENT ON COLUMN "vacation_requests"."supervisor_approved_at" IS 'Fecha de aprobación del supervisor';
COMMENT ON COLUMN "vacation_requests"."supervisor_comments" IS 'Comentarios del supervisor';
COMMENT ON COLUMN "vacation_requests"."rh_comments" IS 'Comentarios de RH en la validación final';
COMMENT ON COLUMN "vacation_requests"."rejected_by_id" IS 'ID de quien rechazó la solicitud';
COMMENT ON COLUMN "vacation_requests"."rejected_at" IS 'Fecha de rechazo';
COMMENT ON COLUMN "vacation_requests"."rejected_stage" IS 'Etapa del rechazo: SUPERVISOR o RH';
