-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "clockInRadiusMetres" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT NOT NULL,
    CONSTRAINT "Location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocationStaff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "LocationStaff_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LocationStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CertificationType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "validityMonths" INTEGER NOT NULL DEFAULT 12,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "requiredForRoles" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT NOT NULL,
    CONSTRAINT "CertificationType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserCertification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueDate" DATETIME NOT NULL,
    "expiryDate" DATETIME,
    "certificateNumber" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "certificationTypeId" TEXT NOT NULL,
    CONSTRAINT "UserCertification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserCertification_certificationTypeId_fkey" FOREIGN KEY ("certificationTypeId") REFERENCES "CertificationType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaffAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "specificDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "StaffAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "locationId" TEXT,
    CONSTRAINT "Shift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shift_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ShiftTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shift_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ShiftCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shift_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Shift" ("assignedToId", "categoryId", "createdAt", "createdById", "description", "endTime", "id", "isOpen", "organizationId", "scheduledBreakMinutes", "startTime", "status", "templateId", "title", "updatedAt") SELECT "assignedToId", "categoryId", "createdAt", "createdById", "description", "endTime", "id", "isOpen", "organizationId", "scheduledBreakMinutes", "startTime", "status", "templateId", "title", "updatedAt" FROM "Shift";
DROP TABLE "Shift";
ALTER TABLE "new_Shift" RENAME TO "Shift";
CREATE INDEX "Shift_organizationId_idx" ON "Shift"("organizationId");
CREATE INDEX "Shift_assignedToId_idx" ON "Shift"("assignedToId");
CREATE INDEX "Shift_startTime_endTime_idx" ON "Shift"("startTime", "endTime");
CREATE INDEX "Shift_categoryId_idx" ON "Shift"("categoryId");
CREATE INDEX "Shift_locationId_idx" ON "Shift"("locationId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "staffRole" TEXT NOT NULL DEFAULT 'DESK',
    "avatarUrl" TEXT,
    "phone" TEXT,
    "holidayBalance" INTEGER NOT NULL DEFAULT 25,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT NOT NULL,
    "primaryLocationId" TEXT,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_primaryLocationId_fkey" FOREIGN KEY ("primaryLocationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "email", "holidayBalance", "id", "name", "organizationId", "password", "phone", "role", "updatedAt") SELECT "avatarUrl", "createdAt", "email", "holidayBalance", "id", "name", "organizationId", "password", "phone", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_staffRole_idx" ON "User"("staffRole");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Location_organizationId_idx" ON "Location"("organizationId");

-- CreateIndex
CREATE INDEX "LocationStaff_userId_idx" ON "LocationStaff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationStaff_locationId_userId_key" ON "LocationStaff"("locationId", "userId");

-- CreateIndex
CREATE INDEX "CertificationType_organizationId_idx" ON "CertificationType"("organizationId");

-- CreateIndex
CREATE INDEX "UserCertification_userId_idx" ON "UserCertification"("userId");

-- CreateIndex
CREATE INDEX "UserCertification_certificationTypeId_idx" ON "UserCertification"("certificationTypeId");

-- CreateIndex
CREATE INDEX "UserCertification_expiryDate_idx" ON "UserCertification"("expiryDate");

-- CreateIndex
CREATE INDEX "StaffAvailability_userId_idx" ON "StaffAvailability"("userId");

-- CreateIndex
CREATE INDEX "StaffAvailability_dayOfWeek_idx" ON "StaffAvailability"("dayOfWeek");
