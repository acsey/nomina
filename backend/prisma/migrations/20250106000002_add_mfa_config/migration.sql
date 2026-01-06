-- P0.1 - Identidad y Acceso: Tabla para configuración MFA
-- Esta tabla almacena la configuración de autenticación de dos factores (TOTP)

CREATE TABLE "mfa_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL UNIQUE,
    "secret" TEXT NOT NULL,
    "backup_codes" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(3),
    "disabled_at" TIMESTAMP(3),

    CONSTRAINT "mfa_config_pkey" PRIMARY KEY ("id")
);

-- Índice para búsqueda por status (el índice unique de user_id ya se crea con UNIQUE constraint)
CREATE INDEX IF NOT EXISTS "mfa_config_status_idx" ON "mfa_config"("status");

-- Relación con usuarios
ALTER TABLE "mfa_config" ADD CONSTRAINT "mfa_config_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comentarios
COMMENT ON TABLE "mfa_config" IS 'P0.1 MFA: Configuración de autenticación de dos factores TOTP';
COMMENT ON COLUMN "mfa_config"."secret" IS 'Secreto TOTP cifrado (Base32)';
COMMENT ON COLUMN "mfa_config"."backup_codes" IS 'Códigos de respaldo cifrados (JSON array)';
COMMENT ON COLUMN "mfa_config"."status" IS 'Estado: PENDING, ACTIVE, DISABLED';
