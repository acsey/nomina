-- Add hierarchy fields to employees
ALTER TABLE "employees" ADD COLUMN "supervisor_id" TEXT;
ALTER TABLE "employees" ADD COLUMN "hierarchy_level" INTEGER NOT NULL DEFAULT 0;

-- Add foreign key for supervisor
ALTER TABLE "employees" ADD CONSTRAINT "employees_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create DelegationType enum
CREATE TYPE "DelegationType" AS ENUM ('VACATION', 'PERMISSION', 'INCIDENT', 'ALL');

-- Create approval_delegations table
CREATE TABLE "approval_delegations" (
    "id" TEXT NOT NULL,
    "delegator_id" TEXT NOT NULL,
    "delegatee_id" TEXT NOT NULL,
    "delegation_type" "DelegationType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_delegations_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for approval_delegations
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegator_id_fkey" FOREIGN KEY ("delegator_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegatee_id_fkey" FOREIGN KEY ("delegatee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create BenefitStatus enum
CREATE TYPE "BenefitStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Add approval workflow fields to benefits
ALTER TABLE "benefits" ADD COLUMN "status" "BenefitStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "benefits" ADD COLUMN "created_by_id" TEXT;
ALTER TABLE "benefits" ADD COLUMN "approved_by_id" TEXT;
ALTER TABLE "benefits" ADD COLUMN "approved_at" TIMESTAMP(3);
ALTER TABLE "benefits" ADD COLUMN "rejected_reason" TEXT;

-- Add foreign keys for benefits approval
ALTER TABLE "benefits" ADD CONSTRAINT "benefits_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "benefits" ADD CONSTRAINT "benefits_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update existing benefits to APPROVED status (they were created before approval workflow)
UPDATE "benefits" SET "status" = 'APPROVED' WHERE "status" = 'PENDING';

-- Add approval_chain column to vacation_requests for tracking approval hierarchy
ALTER TABLE "vacation_requests" ADD COLUMN "approval_chain" JSONB;
