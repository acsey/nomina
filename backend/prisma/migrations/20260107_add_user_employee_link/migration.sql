-- AlterTable: Add optional user_id to employees for personal account linking
-- This allows employees to have their own user account for portal access
-- While keeping functional accounts (HR, Payroll) separate without employee records

ALTER TABLE "employees" ADD COLUMN "user_id" TEXT;

-- CreateIndex: Ensure one-to-one relationship (each user can only be linked to one employee)
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- AddForeignKey: Link employee to user
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
