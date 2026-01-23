-- AlterTable
ALTER TABLE "company_calculation_formulas" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "company_special_payroll_configs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "subsidio_empleo_tables" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "data_type" TEXT NOT NULL DEFAULT 'string',
    "category" TEXT NOT NULL DEFAULT 'general',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_devices" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "device_type" TEXT NOT NULL,
    "connection_mode" TEXT NOT NULL DEFAULT 'PULL',
    "ip" TEXT,
    "port" INTEGER NOT NULL DEFAULT 4370,
    "serial_number" TEXT,
    "location" TEXT,
    "config" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometric_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_logs" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "event_type" TEXT NOT NULL,
    "verify_mode" TEXT,
    "raw_data" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometric_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- AddForeignKey
ALTER TABLE "biometric_devices" ADD CONSTRAINT "biometric_devices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_logs" ADD CONSTRAINT "biometric_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "biometric_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_logs" ADD CONSTRAINT "biometric_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
