ALTER TABLE "jobs" ALTER COLUMN "location" DROP NOT NULL, ALTER COLUMN "workType" DROP NOT NULL,
  ALTER COLUMN "experienceLevel" DROP NOT NULL, ALTER COLUMN "description" DROP NOT NULL,
  ALTER COLUMN "postedAt" DROP NOT NULL, ALTER COLUMN "postedAt" DROP DEFAULT;
ALTER TABLE "jobs" ADD COLUMN "discoveryKey" TEXT, ADD COLUMN "currency" TEXT, ADD COLUMN "salaryPeriod" TEXT,
  ADD COLUMN "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "jobs_sourceUrl_key" ON "jobs"("sourceUrl");
CREATE UNIQUE INDEX "jobs_discoveryKey_key" ON "jobs"("discoveryKey");
CREATE TABLE "job_discovery_runs" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "conversationId" TEXT NOT NULL,
  "contextVersion" INTEGER NOT NULL, "searchIntent" JSONB NOT NULL,
  "status" TEXT NOT NULL, "sourceReports" JSONB NOT NULL, "jobIds" JSONB NOT NULL,
  "resultCount" INTEGER NOT NULL DEFAULT 0, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3), "errorCode" TEXT,
  CONSTRAINT "job_discovery_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "job_discovery_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "job_discovery_runs_conversationId_contextVersion_key" ON "job_discovery_runs"("conversationId", "contextVersion");
CREATE INDEX "job_discovery_runs_userId_startedAt_idx" ON "job_discovery_runs"("userId", "startedAt");
