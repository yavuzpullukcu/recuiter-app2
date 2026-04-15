-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "maxCandidates" INTEGER NOT NULL DEFAULT 20,
    "maxJobs" INTEGER NOT NULL DEFAULT 5,
    "maxTeamMembers" INTEGER NOT NULL DEFAULT 1,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "renewalDate" DATETIME,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "description" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "workload" TEXT,
    "contractType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "jdFile" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "location" TEXT,
    "linkedin" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "skills" TEXT NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'new',
    "rating" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT,
    "type" TEXT NOT NULL DEFAULT 'external',
    "cvFile" TEXT,
    "jobId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Candidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Candidate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Activity_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Company" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "jobId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "weeklyHours" INTEGER NOT NULL DEFAULT 40,
    "hourlyRate" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assignment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assignmentId" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "renewalCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RawJob" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "externalJobId" TEXT,
    "url" TEXT,
    "titleRaw" TEXT NOT NULL,
    "descriptionRaw" TEXT NOT NULL,
    "locationRaw" TEXT,
    "postedAtRaw" TEXT,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" TEXT NOT NULL,
    "hashSignature" TEXT NOT NULL,
    "parsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NormalizedJob" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rawJobId" INTEGER NOT NULL,
    "titleClean" TEXT NOT NULL,
    "roleFamily" TEXT,
    "seniority" TEXT,
    "techStackJson" TEXT,
    "mustHaveJson" TEXT,
    "niceToHaveJson" TEXT,
    "languagesJson" TEXT,
    "remoteType" TEXT,
    "contractModel" TEXT,
    "location" TEXT,
    "locationCountry" TEXT,
    "projectDuration" TEXT,
    "startDate" TEXT,
    "weeklyHours" TEXT,
    "capacityPercent" TEXT,
    "rateMax" TEXT,
    "urgencyScore" INTEGER NOT NULL DEFAULT 0,
    "bodyLeasingFitScore" INTEGER NOT NULL DEFAULT 0,
    "candidateDifficultyScore" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "customerType" TEXT,
    "sourceSignals" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NormalizedJob_rawJobId_fkey" FOREIGN KEY ("rawJobId") REFERENCES "RawJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobMatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "normalizedJobId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "matchScore" INTEGER NOT NULL DEFAULT 0,
    "explanation" TEXT,
    "missingSkills" TEXT,
    "hardFilterPass" BOOLEAN NOT NULL DEFAULT false,
    "skillOverlap" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobMatch_normalizedJobId_fkey" FOREIGN KEY ("normalizedJobId") REFERENCES "NormalizedJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobMatch_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Job_userId_idx" ON "Job"("userId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Candidate_userId_idx" ON "Candidate"("userId");

-- CreateIndex
CREATE INDEX "Candidate_status_idx" ON "Candidate"("status");

-- CreateIndex
CREATE INDEX "Candidate_jobId_idx" ON "Candidate"("jobId");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "Activity_candidateId_idx" ON "Activity"("candidateId");

-- CreateIndex
CREATE INDEX "Company_userId_idx" ON "Company"("userId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- CreateIndex
CREATE INDEX "Assignment_userId_idx" ON "Assignment"("userId");

-- CreateIndex
CREATE INDEX "Assignment_candidateId_idx" ON "Assignment"("candidateId");

-- CreateIndex
CREATE INDEX "Assignment_projectId_idx" ON "Assignment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_assignmentId_key" ON "Contract"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "RawJob_hashSignature_key" ON "RawJob"("hashSignature");

-- CreateIndex
CREATE UNIQUE INDEX "NormalizedJob_rawJobId_key" ON "NormalizedJob"("rawJobId");
