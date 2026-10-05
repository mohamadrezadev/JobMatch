import { ConversationContext } from "./conversation";

export const GUEST_MESSAGE_LIMIT = 5;
export interface GuestMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sequence: number;
  createdAt: string;
}
export interface GuestConversation {
  tokenHash: string;
  context: ConversationContext;
  messages: GuestMessage[];
  turns: number;
  expiresAt: Date;
  claimedBy: string | null;
  conversationId: string | null;
}
export class GuestLimitReached extends Error {}
export class GuestSessionUnavailable extends Error {}
