export const INTENTS = [
  "JOB_SEARCH",
  "UPDATE_SEARCH",
  "PROFILE_UPDATE",
  "JOB_DETAILS",
  "JOB_FEEDBACK",
  "RESUME_BUILD",
  "GENERAL_CAREER_QUESTION",
] as const;
export type ChatIntent = (typeof INTENTS)[number];
export interface JobSearchIntent {
  targetRoles: string[];
  preferredSkills?: string[];
  excludedSkills?: string[];
  workTypes?: Array<"Remote" | "Hybrid" | "OnSite">;
  locations?: string[];
  minimumSalary?: number;
  currency?: "TOMAN";
  experienceLevel?: string;
  excludedCompanies?: string[];
  keywords?: string[];
}
export interface CandidateFacts {
  skills: string[];
  deniedSkills: string[];
  experienceYears?: number;
  statements: string[];
}
export interface ConversationContext {
  searchContext: JobSearchIntent;
  candidateFacts: CandidateFacts;
}
export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  sequence: number;
  createdAt: Date;
}
export interface ConversationSummary {
  id: string;
  updatedAt: Date;
}
export interface ConversationRecord extends ConversationSummary {
  userId: string;
  version: number;
  context: ConversationContext;
  messages: ChatMessage[];
}
export class ConversationNotFound extends Error {}
export class ConversationConflict extends Error {}
export function emptyContext(): ConversationContext {
  return {
    searchContext: { targetRoles: [] },
    candidateFacts: { skills: [], deniedSkills: [], statements: [] },
  };
}
