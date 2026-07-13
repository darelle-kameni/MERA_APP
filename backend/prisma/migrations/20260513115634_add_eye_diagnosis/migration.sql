-- AlterTable
ALTER TABLE "DiagnosticSession" ADD COLUMN "eye_left_confidence" REAL;
ALTER TABLE "DiagnosticSession" ADD COLUMN "eye_left_diagnosis" TEXT;
ALTER TABLE "DiagnosticSession" ADD COLUMN "eye_right_confidence" REAL;
ALTER TABLE "DiagnosticSession" ADD COLUMN "eye_right_diagnosis" TEXT;
