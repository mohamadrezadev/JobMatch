import { ConversationContext } from "./conversation";
import { DiscoveredJob } from "../../job-discovery/domain/discovery";

export interface GuestDiscovery {
  jobs: Array<
    Pick<
      DiscoveredJob,
      | "title"
      | "company"
      | "location"
      | "workType"
      | "salaryMin"
      | "salaryMax"
      | "currency"
      | "salaryPeriod"
      | "source"
      | "sourceUrl"
    > & { warnings: string[] }
  >;
  sources: Array<{
    source: string;
    found: number;
    accepted: number;
    rejected: number;
    failed: boolean;
  }>;
  partial: boolean;
  error?: string;
}

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
  context: ConversationContext & { guestDiscovery?: GuestDiscovery };
  messages: GuestMessage[];
  turns: number;
  expiresAt: Date;
  claimedBy: string | null;
  conversationId: string | null;
}
export class GuestLimitReached extends Error {}
export class GuestSessionUnavailable extends Error {}
