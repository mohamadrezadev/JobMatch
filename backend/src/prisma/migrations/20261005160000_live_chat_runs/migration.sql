CREATE TABLE "chat_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "conversationId" TEXT,
    "retryOf" TEXT,
    "message" TEXT NOT NULL,
    "userMessageId" TEXT,
    "assistantMessageId" TEXT,
    "contextVersion" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "eventSequence" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "chat_runs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "chat_run_events" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_run_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "chat_runs_userId_requestId_key" ON "chat_runs"("userId", "requestId");
CREATE INDEX "chat_runs_conversationId_startedAt_idx" ON "chat_runs"("conversationId", "startedAt");
CREATE UNIQUE INDEX "chat_runs_active_conversation_key" ON "chat_runs"("conversationId") WHERE "status" IN ('QUEUED', 'RUNNING');
CREATE UNIQUE INDEX "chat_run_events_runId_sequence_key" ON "chat_run_events"("runId", "sequence");
ALTER TABLE "chat_runs" ADD CONSTRAINT "chat_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_runs" ADD CONSTRAINT "chat_runs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_run_events" ADD CONSTRAINT "chat_run_events_runId_fkey" FOREIGN KEY ("runId") REFERENCES "chat_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
