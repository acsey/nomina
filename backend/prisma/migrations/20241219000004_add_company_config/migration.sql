-- AlterTable - Add company branding and CFDI configuration
ALTER TABLE "companies" ADD COLUMN "primary_color" TEXT DEFAULT '#1E40AF';
ALTER TABLE "companies" ADD COLUMN "secondary_color" TEXT DEFAULT '#3B82F6';
ALTER TABLE "companies" ADD COLUMN "regimen_fiscal" TEXT;
ALTER TABLE "companies" ADD COLUMN "certificado_cer" TEXT;
ALTER TABLE "companies" ADD COLUMN "certificado_key" TEXT;
ALTER TABLE "companies" ADD COLUMN "certificado_password" TEXT;
ALTER TABLE "companies" ADD COLUMN "no_certificado" TEXT;
ALTER TABLE "companies" ADD COLUMN "certificado_vigencia_inicio" TIMESTAMP(3);
ALTER TABLE "companies" ADD COLUMN "certificado_vigencia_fin" TIMESTAMP(3);
ALTER TABLE "companies" ADD COLUMN "pac_provider" TEXT;
ALTER TABLE "companies" ADD COLUMN "pac_user" TEXT;
ALTER TABLE "companies" ADD COLUMN "pac_password" TEXT;
ALTER TABLE "companies" ADD COLUMN "pac_mode" TEXT DEFAULT 'sandbox';
