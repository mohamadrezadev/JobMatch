import { ContextService } from "../domain/context.service";
import { chatReply } from "../domain/chat-reply";
import { emptyContext } from "../domain/conversation";
import {
  GUEST_MESSAGE_LIMIT,
  GuestConversation,
  GuestLimitReached,
  GuestSessionUnavailable,
} from "../domain/guest-conversation";
import { GuestConversationRepository } from "./guest-conversation.repository";

export class GuestChatService {
  constructor(
    private readonly repository: GuestConversationRepository,
    private readonly extractor: ContextService,
  ) {}

  private available(session: GuestConversation) {
    if (session.expiresAt.getTime() <= Date.now() || session.claimedBy)
      throw new GuestSessionUnavailable();
  }
  private view(session: GuestConversation | null) {
    return {
      messages: session?.messages ?? [],
      context: session?.context ?? emptyContext(),
      remaining: GUEST_MESSAGE_LIMIT - (session?.turns ?? 0),
      limit: GUEST_MESSAGE_LIMIT,
      authRequired: (session?.turns ?? 0) >= GUEST_MESSAGE_LIMIT,
    };
  }
  async get(tokenHash?: string) {
    const session = tokenHash ? await this.repository.get(tokenHash) : null;
    if (session) this.available(session);
    return this.view(session);
  }
  async send(tokenHash: string, message: string) {
    const previous =
      (await this.repository.get(tokenHash)) ??
      (await this.repository.create(tokenHash));
    this.available(previous);
    if (previous.turns >= GUEST_MESSAGE_LIMIT) throw new GuestLimitReached();
    const result = this.extractor.extract(message, previous.context);
    const reply = chatReply(result);
    const time = new Date().toISOString();
    const sequence = previous.turns * 2;
    const next: GuestConversation = {
      ...previous,
      context: result.context,
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
