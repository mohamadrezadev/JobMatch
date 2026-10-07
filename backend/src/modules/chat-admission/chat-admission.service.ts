import { HttpException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export interface ChatAvailability {
  active: boolean;
  activeRunId: string | null;
  nextAllowedAt: string;
  retryAfterSeconds: number;
}
export class ChatAdmissionError extends HttpException {
  constructor(readonly availability: ChatAvailability) {
    super(
      {
        code: availability.active ? "REQUEST_ACTIVE" : "SEARCH_COOLDOWN",
        message: availability.active
          ? "درخواست قبلی هنوز در حال انجام است؛ نتیجه همان درخواست را دنبال کنید."
          : "برای حفظ کیفیت جستجو، کمی صبر کنید؛ متن شما حفظ شده است.",
        ...availability,
      },
      availability.active ? 409 : 429,
    );
  }
}
@Injectable()
export class ChatAdmissionService {
  constructor(private readonly prisma: PrismaService) {}
  private get pauseSeconds() {
    return Math.max(
      5,
      Math.min(60, Number(process.env.CHAT_SEARCH_COOLDOWN_SECONDS) || 15),
    );
  }
  async availability(
    key: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<ChatAvailability> {
    const rows = await tx.$queryRaw<
      Array<{
        leaseId: string | null;
        leaseUntil: Date;
        nextAllowedAt: Date;
        now: Date;
      }>
    >`
      SELECT "leaseId", "leaseUntil", "nextAllowedAt", CURRENT_TIMESTAMP AS now
      FROM "chat_request_gates" WHERE "key" = ${key}`;
    const row = rows[0];
    const now = row?.now ?? new Date();
    const active = !!row?.leaseId && row.leaseUntil > now;
    const next = active ? row!.leaseUntil : (row?.nextAllowedAt ?? now);
    return {
      active,
      activeRunId: active && key.startsWith("user:") ? row!.leaseId : null,
      nextAllowedAt: next.toISOString(),
      retryAfterSeconds: Math.max(
        0,
        Math.ceil((next.getTime() - now.getTime()) / 1000),
      ),
    };
  }
  async reserve(
    key: string,
    leaseId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    // A conditional UPSERT locks the identity row across processes. Admission and
    // authenticated run creation share the same transaction.
    const accepted = await tx.$queryRaw<Array<{ key: string }>>`
      INSERT INTO "chat_request_gates" ("key", "leaseId", "leaseUntil", "nextAllowedAt")
      VALUES (${key}, ${leaseId}, CURRENT_TIMESTAMP + INTERVAL '3 minutes', CURRENT_TIMESTAMP)
      ON CONFLICT ("key") DO UPDATE SET "leaseId" = EXCLUDED."leaseId",
        "leaseUntil" = EXCLUDED."leaseUntil", "nextAllowedAt" = EXCLUDED."nextAllowedAt"
      WHERE "chat_request_gates"."leaseUntil" <= CURRENT_TIMESTAMP
        AND "chat_request_gates"."nextAllowedAt" <= CURRENT_TIMESTAMP
      RETURNING "key"`;
    if (!accepted.length)
      throw new ChatAdmissionError(await this.availability(key, tx));
  }
  async release(
    key: string,
    leaseId: string,
    searched: boolean,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const seconds = searched ? this.pauseSeconds : 0;
    await tx.$executeRaw`
      UPDATE "chat_request_gates" SET "leaseId" = NULL, "leaseUntil" = CURRENT_TIMESTAMP,
        "nextAllowedAt" = CURRENT_TIMESTAMP + (${seconds} * INTERVAL '1 second')
      WHERE "key" = ${key} AND "leaseId" = ${leaseId}`;
  }
}
