-- AlterTable
ALTER TABLE "MedicalReview" ADD COLUMN "pdf_url" TEXT;

-- CreateTable
CREATE TABLE "RegistrationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "signature_url" TEXT,
    "message" TEXT,
    "user_id" TEXT,
    "approver_id" TEXT,
    "approved_at" DATETIME,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "RegistrationRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RegistrationRequest_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DoctorAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doctor_id" TEXT NOT NULL,
    "encadreur_id" TEXT NOT NULL,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DoctorAssignment_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DoctorAssignment_encadreur_id_fkey" FOREIGN KEY ("encadreur_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipient_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "payload" TEXT,
    "read_at" DATETIME,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "qr_code" TEXT,
    "pin_hash" TEXT,
    "full_name" TEXT,
    "age" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "village" TEXT,
    "phone" TEXT,
    "health_center_id" TEXT,
    "guardian_id" TEXT,
    "is_pediatric" BOOLEAN NOT NULL DEFAULT false,
    "last_login" DATETIME,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "Patient_health_center_id_fkey" FOREIGN KEY ("health_center_id") REFERENCES "HealthCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Patient_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Patient" ("age", "created_date", "full_name", "health_center_id", "id", "is_pediatric", "last_login", "phone", "pin_hash", "qr_code", "sex", "updated_date", "village") SELECT "age", "created_date", "full_name", "health_center_id", "id", "is_pediatric", "last_login", "phone", "pin_hash", "qr_code", "sex", "updated_date", "village" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE UNIQUE INDEX "Patient_qr_code_key" ON "Patient"("qr_code");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "id_card" TEXT,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'encadreur',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "signature_url" TEXT,
    "health_center_id" TEXT,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "User_health_center_id_fkey" FOREIGN KEY ("health_center_id") REFERENCES "HealthCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("created_date", "email", "full_name", "health_center_id", "id", "password_hash", "role", "updated_date") SELECT "created_date", "email", "full_name", "health_center_id", "id", "password_hash", "role", "updated_date" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_id_card_key" ON "User"("id_card");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationRequest_email_key" ON "RegistrationRequest"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationRequest_user_id_key" ON "RegistrationRequest"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorAssignment_doctor_id_encadreur_id_key" ON "DoctorAssignment"("doctor_id", "encadreur_id");

-- CreateIndex
CREATE INDEX "Notification_recipient_id_read_at_idx" ON "Notification"("recipient_id", "read_at");

-- Data migration: remap legacy roles, activate existing users so they can still login.
UPDATE "User" SET "role" = 'encadreur' WHERE "role" = 'agent';
UPDATE "User" SET "role" = 'medecin'   WHERE "role" = 'doctor';
UPDATE "User" SET "status" = 'active'  WHERE "status" = 'pending';
