-- CreateTable
CREATE TABLE "ShiftCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hourlyRate" REAL NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT NOT NULL,
    CONSTRAINT "ShiftCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "shiftReminderHours" INTEGER NOT NULL DEFAULT 24
);
INSERT INTO "new_Organization" ("createdAt", "id", "name", "timezone", "updatedAt") SELECT "createdAt", "id", "name", "timezone", "updatedAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE TABLE "new_Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "scheduledBreakMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "templateId" TEXT,
    "categoryId" TEXT,
    CONSTRAINT "Shift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shift_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ShiftTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shift_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ShiftCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Shift" ("assignedToId", "createdAt", "createdById", "description", "endTime", "id", "isOpen", "organizationId", "startTime", "status", "templateId", "title", "updatedAt") SELECT "assignedToId", "createdAt", "createdById", "description", "endTime", "id", "isOpen", "organizationId", "startTime", "status", "templateId", "title", "updatedAt" FROM "Shift";
DROP TABLE "Shift";
ALTER TABLE "new_Shift" RENAME TO "Shift";
CREATE INDEX "Shift_organizationId_idx" ON "Shift"("organizationId");
CREATE INDEX "Shift_assignedToId_idx" ON "Shift"("assignedToId");
CREATE INDEX "Shift_startTime_endTime_idx" ON "Shift"("startTime", "endTime");
CREATE INDEX "Shift_categoryId_idx" ON "Shift"("categoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ShiftCategory_organizationId_idx" ON "ShiftCategory"("organizationId");
