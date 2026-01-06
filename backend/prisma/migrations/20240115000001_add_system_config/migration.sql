-- System Configuration Table
-- Stores application-wide configuration settings

CREATE TABLE IF NOT EXISTS "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "data_type" TEXT NOT NULL DEFAULT 'STRING',
    "category" TEXT NOT NULL DEFAULT 'general',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- Create unique index on key
CREATE UNIQUE INDEX IF NOT EXISTS "system_configs_key_key" ON "system_configs"("key");
