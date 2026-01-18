-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN "clockInLatitude" REAL;
ALTER TABLE "TimeEntry" ADD COLUMN "clockInLongitude" REAL;
ALTER TABLE "TimeEntry" ADD COLUMN "clockOutLatitude" REAL;
ALTER TABLE "TimeEntry" ADD COLUMN "clockOutLongitude" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "breakRules" TEXT NOT NULL DEFAULT '[{"minHours":4,"breakMinutes":15},{"minHours":6,"breakMinutes":30},{"minHours":8,"breakMinutes":60}]',
    "clockInWindowMinutes" INTEGER NOT NULL DEFAULT 15,
    "clockOutGraceMinutes" INTEGER NOT NULL DEFAULT 30,
    "shiftReminderHours" INTEGER NOT NULL DEFAULT 24,
    "locationLatitude" REAL,
    "locationLongitude" REAL,
    "clockInRadiusMetres" INTEGER NOT NULL DEFAULT 100,
    "requireGeolocation" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Organization" ("breakRules", "clockInWindowMinutes", "clockOutGraceMinutes", "createdAt", "id", "name", "shiftReminderHours", "timezone", "updatedAt") SELECT "breakRules", "clockInWindowMinutes", "clockOutGraceMinutes", "createdAt", "id", "name", "shiftReminderHours", "timezone", "updatedAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
