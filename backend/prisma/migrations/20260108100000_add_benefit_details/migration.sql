-- AlterTable: Add enhanced content fields for employee portal benefits
ALTER TABLE "benefits" ADD COLUMN IF NOT EXISTS "detailed_description" TEXT;
ALTER TABLE "benefits" ADD COLUMN IF NOT EXISTS "includes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "benefits" ADD COLUMN IF NOT EXISTS "terms_and_conditions" TEXT;
ALTER TABLE "benefits" ADD COLUMN IF NOT EXISTS "pdf_document_path" TEXT;
