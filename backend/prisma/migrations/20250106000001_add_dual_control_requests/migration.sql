-- P0.2 - Segregación de Funciones: Tabla para Dual Control (Maker-Checker)
-- Esta tabla almacena solicitudes que requieren aprobación de un segundo usuario

CREATE TABLE "dual_control_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requester_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "justification" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approver_id" TEXT,
    "approver_comments" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dual_control_requests_pkey" PRIMARY KEY ("id")
);

-- Índices para búsqueda eficiente
CREATE INDEX "dual_control_requests_requester_id_idx" ON "dual_control_requests"("requester_id");
CREATE INDEX "dual_control_requests_approver_id_idx" ON "dual_control_requests"("approver_id");
CREATE INDEX "dual_control_requests_status_idx" ON "dual_control_requests"("status");
CREATE INDEX "dual_control_requests_operation_idx" ON "dual_control_requests"("operation");
CREATE INDEX "dual_control_requests_entity_idx" ON "dual_control_requests"("entity", "entity_id");
CREATE INDEX "dual_control_requests_expires_at_idx" ON "dual_control_requests"("expires_at");

-- Relaciones con usuarios
ALTER TABLE "dual_control_requests" ADD CONSTRAINT "dual_control_requests_requester_id_fkey"
    FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dual_control_requests" ADD CONSTRAINT "dual_control_requests_approver_id_fkey"
    FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Comentarios
COMMENT ON TABLE "dual_control_requests" IS 'P0.2 SoD: Solicitudes de dual control (maker-checker)';
COMMENT ON COLUMN "dual_control_requests"."operation" IS 'Tipo de operación: PAYROLL_APPROVE, CFDI_CANCEL, etc.';
COMMENT ON COLUMN "dual_control_requests"."status" IS 'Estado: PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED';
