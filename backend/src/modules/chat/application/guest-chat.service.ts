import { ContextService } from "../domain/context.service";
import { chatReply } from "../domain/chat-reply";
import { emptyContext, ConversationConflict } from "../domain/conversation";
import {
  GuestDiscoveryService,
  GuestProgress,
} from "./guest-discovery.service";
import {
  GUEST_MESSAGE_LIMIT,
  GuestConversation,
  GuestLimitReached,
  GuestSessionUnavailable,
} from "../domain/guest-conversation";
import { GuestConversationRepository } from "./guest-conversation.repository";

export class GuestChatService {
  private readonly pending = new Set<string>();
  constructor(
    private readonly repository: GuestConversationRepository,
    private readonly extractor: ContextService,
    private readonly discovery?: GuestDiscoveryService,
  ) {}

  private available(session: GuestConversation) {
    if (session.expiresAt.getTime() <= Date.now() || session.claimedBy)
      throw new GuestSessionUnavailable();
  }
  private view(session: GuestConversation | null) {
    return {
      messages: session?.messages ?? [],
      context: session
        ? {
            searchContext: session.context.searchContext,
            candidateFacts: session.context.candidateFacts,
          }
        : emptyContext(),
      ...(session?.context.guestDiscovery
        ? { discovery: session.context.guestDiscovery }
        : {}),
      remaining: GUEST_MESSAGE_LIMIT - (session?.turns ?? 0),
      limit: GUEST_MESSAGE_LIMIT,
      authRequired: (session?.turns ?? 0) >= GUEST_MESSAGE_LIMIT,
    };
  }
  async get(tokenHash?: string) {
    const session = tokenHash ? await this.repository.get(tokenHash) : null;
    if (
      session &&
      (session.expiresAt.getTime() <= Date.now() || session.claimedBy)
    )
      return this.view(null);
    return this.view(session);
  }
  async send(tokenHash: string, message: string, publish?: GuestProgress) {
    if (this.pending.has(tokenHash)) throw new ConversationConflict();
    this.pending.add(tokenHash);
    try {
      return await this.sendTurn(tokenHash, message, publish);
    } finally {
      this.pending.delete(tokenHash);
    }
  }
  private async sendTurn(
    tokenHash: string,
    message: string,
    publish?: GuestProgress,
  ) {
    const previous =
      (await this.repository.get(tokenHash)) ??
      (await this.repository.create(tokenHash));
    this.available(previous);
    if (previous.turns >= GUEST_MESSAGE_LIMIT) throw new GuestLimitReached();
    await publish?.("context.processing", {});
    const result = await this.extractor.resolve(message, {
      searchContext: previous.context.searchContext,
      candidateFacts: previous.context.candidateFacts,
    });
    await publish?.("context.updated", {
      searchContext: result.context.searchContext,
    });
    let reply = chatReply(result);
    let guestDiscovery = previous.context.guestDiscovery;
    if (
      this.discovery &&
      result.context.searchContext.targetRoles.length &&
      ["JOB_SEARCH", "UPDATE_SEARCH"].includes(result.intent)
    ) {
      guestDiscovery = publish
        ? await this.discovery.search(result.context.searchContext, publish)
        : await this.discovery.search(result.context.searchContext);
      reply = guestDiscovery.error
        ? "جستجو انجام شد، اما منابع شغلی پاسخ قابل استفاده ندادند. شرایطت حفظ شده؛ برای تلاش دوباره بنویس «دوباره جستجو کن»."
        : guestDiscovery.jobs.length
          ? `${guestDiscovery.jobs.length.toLocaleString("fa-IR")} موقعیت مرتبط پیدا شد. آگهی‌ها را پایین گفتگو ببین.`
          : "آگهی معتبری با شرایط فعلی پیدا نشد. می‌توانی شرایط جستجو را تغییر بدهی.";
      if (guestDiscovery.partial && !guestDiscovery.error)
        reply += " بعضی منابع کامل بررسی نشدند.";
    }
    const time = new Date().toISOString();
    await publish?.("results.saving", {});
    const sequence = previous.turns * 2;
    const next: GuestConversation = {
      ...previous,
      context: {
        ...result.context,
        ...(guestDiscovery ? { guestDiscovery } : {}),
      },
      turns: previous.turns + 1,
      messages: [
        ...previous.messages,
        {
          id: `guest-${sequence + 1}`,
          role: "user",
          content: message,
          sequence: sequence + 1,
          createdAt: time,
        },
        {
          id: `guest-${sequence + 2}`,
          role: "assistant",
          content: reply,
          sequence: sequence + 2,
          createdAt: time,
        },
      ],
    };
    return this.view(await this.repository.save(previous, next));
  }
  claim(tokenHash: string, userId: string) {
    return this.repository.claim(tokenHash, userId);
  }
}
