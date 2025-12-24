-- AlterTable: Add auth_provider and external_id columns to users
ALTER TABLE "users" ADD COLUMN "auth_provider" TEXT;
ALTER TABLE "users" ADD COLUMN "external_id" TEXT;
