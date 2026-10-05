import axios from "axios";
import type { Conversation } from "@/types/chat";

export interface GuestChatState {
  messages: Conversation["messages"];
  context: Conversation["context"];
  remaining: number;
  limit: number;
  authRequired: boolean;
}
export const guestChatClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
export const guestContinuationKey = "jobmatch-guest-continuation";
export const guestDraftKey = "jobmatch-chat-draft";
