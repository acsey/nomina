-- AlterEnum - Add missing values to IncidentCategory
ALTER TYPE "IncidentCategory" ADD VALUE IF NOT EXISTS 'DISCOUNT';
ALTER TYPE "IncidentCategory" ADD VALUE IF NOT EXISTS 'DISABILITY';
ALTER TYPE "IncidentCategory" ADD VALUE IF NOT EXISTS 'JUSTIFIED_ABSENCE';

-- AlterEnum - Add missing values to IncidentValueType
ALTER TYPE "IncidentValueType" ADD VALUE IF NOT EXISTS 'FIXED_AMOUNT';
