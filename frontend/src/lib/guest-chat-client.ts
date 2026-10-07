import axios from "axios";
import type { Conversation } from "@/types/chat";
import type { DiscoveryJob, DiscoveryIssue } from "@/types/discovery";
import type { ChatAvailability } from "./chat-availability";

export interface GuestDiscovery {
  jobs: Array<Omit<DiscoveryJob, "id" | "requiredSkills" | "preferredSkills">>;
  sources: Array<{
    source: string;
    found: number;
    accepted: number;
    rejected: number;
    failed: boolean;
    issue?: DiscoveryIssue;
  }>;
  partial: boolean;
  error?: string;
  issue?: DiscoveryIssue;
}

export interface GuestChatState {
  availability?: ChatAvailability;
  messages: Conversation["messages"];
  context: Conversation["context"];
  remaining: number;
  limit: number;
  authRequired: boolean;
  discovery?: GuestDiscovery;
}
export const guestChatClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
  withCredentials: true,
  timeout: 90000,
  headers: { "Content-Type": "application/json" },
});
export const guestContinuationKey = "jobmatch-guest-continuation";
export const guestDraftKey = "jobmatch-chat-draft";
