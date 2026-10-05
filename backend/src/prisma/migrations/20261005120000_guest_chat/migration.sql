CREATE TABLE "guest_chat_sessions" (
  "tokenHash" TEXT NOT NULL,
  "context" JSONB NOT NULL,
  "messages" JSONB NOT NULL,
  "turns" INTEGER NOT NULL DEFAULT 0,
  "claimedBy" TEXT,
  "conversationId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guest_chat_sessions_pkey" PRIMARY KEY ("tokenHash")
);
CREATE INDEX "guest_chat_sessions_expiresAt_idx" ON "guest_chat_sessions"("expiresAt");
