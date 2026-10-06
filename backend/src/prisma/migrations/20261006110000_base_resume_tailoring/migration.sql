CREATE TABLE "resume_bases" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resume_bases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "resume_bases_userId_key" ON "resume_bases"("userId");
ALTER TABLE "resume_bases" ADD CONSTRAINT "resume_bases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "resume_proposals" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "sourceSnapshot" JSONB NOT NULL,
  "baseVersion" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROPOSED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "resume_proposals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "resume_proposals_userId_jobId_createdAt_idx" ON "resume_proposals"("userId", "jobId", "createdAt");
ALTER TABLE "resume_proposals" ADD CONSTRAINT "resume_proposals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resume_proposals" ADD CONSTRAINT "resume_proposals_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
