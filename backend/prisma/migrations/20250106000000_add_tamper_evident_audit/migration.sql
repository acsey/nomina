-- P0.3 - Auditoría Tamper-Evident: Hash encadenado
-- Este migration agrega campos para implementar cadena de hash inmutable en logs de auditoría

-- Agregar campos de hash encadenado a audit_logs
ALTER TABLE "audit_logs" ADD COLUMN "entry_hash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "previous_entry_hash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "sequence_number" INTEGER;

-- Crear índices para búsqueda eficiente
CREATE INDEX "audit_logs_entry_hash_idx" ON "audit_logs"("entry_hash");
CREATE INDEX "audit_logs_sequence_number_idx" ON "audit_logs"("sequence_number");

-- Comentario: Los campos se agregan como nullable para compatibilidad con datos existentes
-- La lógica de hash se implementa en el servicio de auditoría
