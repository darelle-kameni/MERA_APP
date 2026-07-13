-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DiagnosticSession" (
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
    "eye_left_diagnosis" TEXT,
    "eye_left_confidence" REAL,
    "eye_right_diagnosis" TEXT,
    "eye_right_confidence" REAL,
    "alerte" BOOLEAN NOT NULL DEFAULT false,
    "session_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "DiagnosticSession_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiagnosticSession_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DiagnosticSession_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "MeraDevice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DiagnosticSession_health_center_id_fkey" FOREIGN KEY ("health_center_id") REFERENCES "HealthCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DiagnosticSession" ("agent_id", "created_date", "device_id", "eye_left_confidence", "eye_left_diagnosis", "eye_right_confidence", "eye_right_diagnosis", "health_center_id", "id", "patient_age", "patient_id", "patient_name", "patient_sex", "recommendations", "session_date", "status", "sync_status", "updated_date", "urgency_level", "vocal_transcript") SELECT "agent_id", "created_date", "device_id", "eye_left_confidence", "eye_left_diagnosis", "eye_right_confidence", "eye_right_diagnosis", "health_center_id", "id", "patient_age", "patient_id", "patient_name", "patient_sex", "recommendations", "session_date", "status", "sync_status", "updated_date", "urgency_level", "vocal_transcript" FROM "DiagnosticSession";
DROP TABLE "DiagnosticSession";
ALTER TABLE "new_DiagnosticSession" RENAME TO "DiagnosticSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
