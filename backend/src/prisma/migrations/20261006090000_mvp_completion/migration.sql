ALTER TABLE "profiles" ADD COLUMN "resumeFacts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE TABLE "analytics_events" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "resourceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "analytics_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "analytics_events_userId_createdAt_idx" ON "analytics_events"("userId", "createdAt");
CREATE INDEX "analytics_events_name_createdAt_idx" ON "analytics_events"("name", "createdAt");
