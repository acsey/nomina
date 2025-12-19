-- Add missing enum values to IncidentCategory
ALTER TYPE "IncidentCategory" ADD VALUE IF NOT EXISTS 'DISABILITY';
ALTER TYPE "IncidentCategory" ADD VALUE IF NOT EXISTS 'JUSTIFIED_ABSENCE';

-- Add missing enum value to IncidentStatus (for cancelled incidents)
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
