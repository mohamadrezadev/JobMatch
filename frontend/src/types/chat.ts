export type ChatIntent =
  | "JOB_SEARCH"
  | "UPDATE_SEARCH"
  | "PROFILE_UPDATE"
  | "JOB_DETAILS"
  | "JOB_FEEDBACK"
  | "RESUME_BUILD"
  | "GENERAL_CAREER_QUESTION";
export interface SearchContext {
  targetRoles: string[];
  requestedCount?: number;
  preferredSkills?: string[];
  requiredSkills?: string[];
  excludedSkills?: string[];
  workTypes?: Array<"Remote" | "Hybrid" | "OnSite">;
  minimumSalary?: number;
  currency?: "TOMAN";
  locations?: string[];
  experienceLevel?: string;
}
export interface CandidateFacts {
  skills: string[];
  deniedSkills: string[];
  experienceYears?: number;
  statements: string[];
}
export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  sequence: number;
  createdAt: string;
}
export interface ConversationSummary {
  id: string;
  updatedAt: string;
}
export interface Conversation extends ConversationSummary {
  context: { searchContext: SearchContext; candidateFacts: CandidateFacts };
  messages: ChatMessage[];
}
export interface ChatReply {
  conversationId: string;
  message: string;
  intent: ChatIntent;
  searchContext: SearchContext;
  candidateFacts: CandidateFacts;
  readyForSearch: boolean;
}
