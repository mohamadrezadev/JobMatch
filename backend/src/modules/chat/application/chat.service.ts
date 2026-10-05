import { ConversationRepository } from "./conversation.repository";
import { ContextService } from "../domain/context.service";
import { emptyContext } from "../domain/conversation";

import { chatReply } from "../domain/chat-reply";

export class ChatService {
  constructor(
    private readonly repository: ConversationRepository,
    private readonly extractor: ContextService,
  ) {}
  list(userId: string) {
    return this.repository.list(userId);
  }
  get(userId: string, id: string) {
    return this.repository.get(userId, id);
  }
  async send(userId: string, message: string, conversationId?: string) {
    const previous = conversationId
      ? await this.repository.get(userId, conversationId)
      : undefined;
    const result = this.extractor.extract(
      message,
      previous?.context ?? emptyContext(),
    );
    const readyForSearch = result.context.searchContext.targetRoles.length > 0;
    const reply = chatReply(result);
    const saved = await this.repository.saveTurn({
      userId,
      previous,
      context: result.context,
      content: message,
      reply,
      intent: result.intent,
    });
    return {
      conversationId: saved.id,
      message: reply,
      intent: result.intent,
      ...result.context,
      readyForSearch,
    };
  }
}
