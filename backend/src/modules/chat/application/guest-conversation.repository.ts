import { GuestConversation } from "../domain/guest-conversation";

export abstract class GuestConversationRepository {
  abstract get(tokenHash: string): Promise<GuestConversation | null>;
  abstract create(tokenHash: string): Promise<GuestConversation>;
  abstract save(
    previous: GuestConversation,
    next: GuestConversation,
  ): Promise<GuestConversation>;
  abstract claim(tokenHash: string, userId: string): Promise<string | null>;
}
