-- CreateTable
CREATE TABLE "job_discovery_candidates" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "stage" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "job_discovery_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_discovery_candidates_runId_status_idx" ON "job_discovery_candidates"("runId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "job_discovery_candidates_runId_canonicalUrl_key" ON "job_discovery_candidates"("runId", "canonicalUrl");

-- AddForeignKey
ALTER TABLE "job_discovery_candidates" ADD CONSTRAINT "job_discovery_candidates_runId_fkey" FOREIGN KEY ("runId") REFERENCES "job_discovery_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
