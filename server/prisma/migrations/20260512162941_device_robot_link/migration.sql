-- Add ESP32 robot connectivity fields to MeraDevice.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_MeraDevice" (
    "id"                  TEXT NOT NULL PRIMARY KEY,
    "serial_number"       TEXT NOT NULL,
    "health_center_id"    TEXT,
    "health_center_name"  TEXT,
    "status"              TEXT NOT NULL DEFAULT 'hors_ligne',
    "battery_level"       REAL,
    "last_sync"           DATETIME,
    "firmware_version"    TEXT,
    "ip_address"          TEXT,
    "port"                INTEGER,
    "api_token"           TEXT,
    "created_date"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date"        DATETIME NOT NULL,
    CONSTRAINT "MeraDevice_health_center_id_fkey" FOREIGN KEY ("health_center_id") REFERENCES "HealthCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_MeraDevice" ("battery_level","created_date","firmware_version","health_center_id","health_center_name","id","last_sync","serial_number","status","updated_date")
SELECT "battery_level","created_date","firmware_version","health_center_id","health_center_name","id","last_sync","serial_number","status","updated_date" FROM "MeraDevice";

DROP TABLE "MeraDevice";
ALTER TABLE "new_MeraDevice" RENAME TO "MeraDevice";

CREATE UNIQUE INDEX "MeraDevice_serial_number_key" ON "MeraDevice"("serial_number");
CREATE UNIQUE INDEX "MeraDevice_api_token_key" ON "MeraDevice"("api_token");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
