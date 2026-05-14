-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "card_id" TEXT,
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
INSERT INTO "new_Patient" ("age", "card_id", "created_date", "full_name", "health_center_id", "id", "is_pediatric", "last_login", "phone", "pin_hash", "sex", "updated_date", "village", "guardian_id")
SELECT "age", "qr_code", "created_date", "full_name", "health_center_id", "id", "is_pediatric", "last_login", "phone", "pin_hash", "sex", "updated_date", "village", "guardian_id" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE UNIQUE INDEX "Patient_card_id_key" ON "Patient"("card_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
