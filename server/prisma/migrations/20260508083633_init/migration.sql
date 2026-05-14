-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'agent',
    "health_center_id" TEXT,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "User_health_center_id_fkey" FOREIGN KEY ("health_center_id") REFERENCES "HealthCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HealthCenter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "district" TEXT,
    "gps_lat" REAL,
    "gps_lng" REAL,
    "center_type" TEXT,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "qr_code" TEXT,
    "full_name" TEXT,
    "age" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "village" TEXT,
    "health_center_id" TEXT,
    "is_pediatric" BOOLEAN NOT NULL DEFAULT false,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "Patient_health_center_id_fkey" FOREIGN KEY ("health_center_id") REFERENCES "HealthCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeraDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serial_number" TEXT NOT NULL,
    "health_center_id" TEXT,
    "health_center_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'hors_ligne',
    "battery_level" REAL,
    "last_sync" DATETIME,
    "firmware_version" TEXT,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "MeraDevice_health_center_id_fkey" FOREIGN KEY ("health_center_id") REFERENCES "HealthCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiagnosticSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "device_id" TEXT,
    "health_center_id" TEXT,
    "urgency_level" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sync_status" TEXT NOT NULL DEFAULT 'synced',
    "vocal_transcript" TEXT,
    "patient_name" TEXT,
    "patient_age" INTEGER,
    "patient_sex" TEXT,
    "recommendations" TEXT,
    "session_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "DiagnosticSession_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiagnosticSession_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DiagnosticSession_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "MeraDevice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DiagnosticSession_health_center_id_fkey" FOREIGN KEY ("health_center_id") REFERENCES "HealthCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VitalSigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "temperature" REAL,
    "spo2" REAL,
    "weight" REAL,
    "heart_rate" REAL,
    "bmi" REAL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "VitalSigns_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "DiagnosticSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EyePhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "photo_url" TEXT,
    "analyzed_by" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "EyePhoto_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "DiagnosticSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContagiousEyeResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "conjunctivitis_bacterial" REAL,
    "conjunctivitis_viral" REAL,
    "trachoma" REAL,
    "blepharitis_infectious" REAL,
    "contagion_alert" BOOLEAN NOT NULL DEFAULT false,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "ContagiousEyeResult_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "DiagnosticSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NonContagiousEyeResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "cataract" REAL,
    "pterygion" REAL,
    "uveitis" REAL,
    "jaundice" REAL,
    "myopia" REAL,
    "glaucoma" REAL,
    "diabetic_retinopathy" REAL,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "NonContagiousEyeResult_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "DiagnosticSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemicPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "disease" TEXT NOT NULL,
    "probability" REAL,
    "severity" TEXT,
    "trigger_factors" TEXT,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "SystemicPrediction_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "DiagnosticSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TraditionalTreatment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "disease" TEXT NOT NULL,
    "plant_name_fr" TEXT NOT NULL,
    "plant_name_local" TEXT,
    "part_used" TEXT,
    "preparation" TEXT,
    "dosage_adult" TEXT,
    "dosage_child" TEXT,
    "precautions" TEXT,
    "max_severity" TEXT,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VocalExchange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "transcript_text" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "VocalExchange_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "DiagnosticSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedicalReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "doctor_id" TEXT,
    "doctor_name" TEXT,
    "note" TEXT,
    "validated_at" DATETIME,
    "referral_needed" BOOLEAN NOT NULL DEFAULT false,
    "referral_hospital" TEXT,
    "status" TEXT NOT NULL,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "MedicalReview_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "DiagnosticSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MedicalReview_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_qr_code_key" ON "Patient"("qr_code");

-- CreateIndex
CREATE UNIQUE INDEX "MeraDevice_serial_number_key" ON "MeraDevice"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "ContagiousEyeResult_session_id_key" ON "ContagiousEyeResult"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "NonContagiousEyeResult_session_id_key" ON "NonContagiousEyeResult"("session_id");
