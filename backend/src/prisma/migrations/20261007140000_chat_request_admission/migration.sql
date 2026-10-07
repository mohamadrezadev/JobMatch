CREATE TABLE "chat_request_gates" (
  "key" TEXT NOT NULL,
  "leaseId" TEXT,
  "leaseUntil" TIMESTAMP(3) NOT NULL,
  "nextAllowedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "chat_request_gates_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "chat_request_gates_nextAllowedAt_idx" ON "chat_request_gates"("nextAllowedAt");
