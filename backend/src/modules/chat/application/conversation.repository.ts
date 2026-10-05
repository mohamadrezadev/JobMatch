import {
  ConversationContext,
  ConversationRecord,
  ConversationSummary,
  ChatIntent,
} from "../domain/conversation";

export abstract class ConversationRepository {
  abstract list(userId: string): Promise<ConversationSummary[]>;
  abstract get(userId: string, id: string): Promise<ConversationRecord>;
  abstract saveTurn(input: {
    userId: string;
    previous?: ConversationRecord;
    context: ConversationContext;
    content: string;
    reply: string;
    intent: ChatIntent;
  }): Promise<ConversationRecord>;
}
