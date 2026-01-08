-- Add Employee Portal Tables
-- Discounts, Agreements, Recognition, Courses, Badges, Surveys

-- Create new enums
CREATE TYPE "DiscountCategory" AS ENUM ('HEALTH', 'EDUCATION', 'ENTERTAINMENT', 'FOOD', 'TRAVEL', 'RETAIL', 'SERVICES', 'OTHER');
CREATE TYPE "RecognitionType" AS ENUM ('TEAMWORK', 'INNOVATION', 'LEADERSHIP', 'EXCELLENCE', 'CUSTOMER_SERVICE', 'COLLABORATION', 'IMPROVEMENT', 'ANNIVERSARY', 'OTHER');
CREATE TYPE "CourseCategory" AS ENUM ('ONBOARDING', 'COMPLIANCE', 'TECHNICAL', 'SOFT_SKILLS', 'LEADERSHIP', 'SAFETY', 'LANGUAGE', 'CERTIFICATION', 'OTHER');
CREATE TYPE "EnrollmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED');
CREATE TYPE "BadgeCategory" AS ENUM ('ACHIEVEMENT', 'MILESTONE', 'TRAINING', 'PERFORMANCE', 'RECOGNITION', 'SPECIAL');
CREATE TYPE "SurveyType" AS ENUM ('CLIMATE', 'SATISFACTION', 'FEEDBACK', 'PULSE', 'EXIT', 'ONBOARDING', 'CUSTOM');
CREATE TYPE "QuestionType" AS ENUM ('RATING', 'TEXT', 'MULTIPLE_CHOICE', 'YES_NO', 'SCALE');
CREATE TYPE "DocumentValidationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- Update employee_documents table
ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "file_size" INTEGER;
ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "mime_type" TEXT;
ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "validation_status" "DocumentValidationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "validated_by_id" TEXT;
ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "validated_at" TIMESTAMP(3);
ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "validation_notes" TEXT;
ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "is_required" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "uploaded_by_id" TEXT;
ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Company Discounts
CREATE TABLE "company_discounts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "partner_company" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT NOT NULL,
    "discount" TEXT NOT NULL,
    "category" "DiscountCategory" NOT NULL,
    "code" TEXT,
    "url" TEXT,
    "valid_from" DATE,
    "valid_until" DATE,
    "terms" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_discounts_pkey" PRIMARY KEY ("id")
);

-- Company Agreements
CREATE TABLE "company_agreements" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "institution_name" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT NOT NULL,
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "contact" TEXT,
    "url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_agreements_pkey" PRIMARY KEY ("id")
);

-- Recognitions
CREATE TABLE "recognitions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "given_by_id" TEXT NOT NULL,
    "type" "RecognitionType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recognitions_pkey" PRIMARY KEY ("id")
);

-- Courses
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "provider" TEXT,
    "category" "CourseCategory" NOT NULL,
    "duration" TEXT,
    "url" TEXT,
    "image_url" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- Course Enrollments
CREATE TABLE "course_enrollments" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "score" INTEGER,
    "certificate_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- Badges
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon_url" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "category" "BadgeCategory" NOT NULL,
    "criteria" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- Employee Badges
CREATE TABLE "employee_badges" (
    "id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "employee_badges_pkey" PRIMARY KEY ("id")
);

-- Surveys
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "SurveyType" NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "target_audience" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- Survey Questions
CREATE TABLE "survey_questions" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- Survey Responses
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- Survey Answers
CREATE TABLE "survey_answers" (
    "id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer_text" TEXT,
    "answer_value" INTEGER,
    "answer_option" TEXT,

    CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
CREATE UNIQUE INDEX "course_enrollments_course_id_employee_id_key" ON "course_enrollments"("course_id", "employee_id");
CREATE UNIQUE INDEX "employee_badges_badge_id_employee_id_key" ON "employee_badges"("badge_id", "employee_id");
CREATE UNIQUE INDEX "survey_responses_survey_id_employee_id_key" ON "survey_responses"("survey_id", "employee_id");

-- Add foreign keys
ALTER TABLE "company_discounts" ADD CONSTRAINT "company_discounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "company_agreements" ADD CONSTRAINT "company_agreements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_given_by_id_fkey" FOREIGN KEY ("given_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "badges" ADD CONSTRAINT "badges_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_badges" ADD CONSTRAINT "employee_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_badges" ADD CONSTRAINT "employee_badges_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "survey_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
