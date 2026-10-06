import { normalize } from "../matching/domain/match";
export interface ResumeSource {
  name: string;
  email: string;
  title: string;
  location: string;
  bio: string;
  facts: string[];
  skills: string[];
  experienceYears: number | null;
}
export interface ResumeContent {
  name: string;
  email: string;
  title: string;
  location: string;
  summary: string;
  highlights: string[];
  skills_to_emphasize: string[];
  experienceYears: number | null;
}
export function guardResume(
  input: unknown,
  source: ResumeSource,
  violation: (field: string) => void,
): ResumeContent {
  const data =
    input !== null && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const allowed = new Set([
    "summary",
    "highlights",
    "skills_to_emphasize",
    "name",
    "email",
    "title",
    "location",
    "experienceYears",
  ]);
  for (const key of Object.keys(data)) if (!allowed.has(key)) violation(key);
  for (const key of [
    "name",
    "email",
    "title",
    "location",
    "experienceYears",
  ] as const)
    if (data[key] !== undefined && data[key] !== source[key]) violation(key);
  const canonical = new Map(source.skills.map((s) => [normalize(s), s]));
  const skills = Array.isArray(data.skills_to_emphasize)
    ? data.skills_to_emphasize.flatMap((s) => {
        if (typeof s !== "string" || !canonical.has(normalize(s))) {
          violation("skills_to_emphasize");
          return [];
        }
        return [canonical.get(normalize(s))!];
      })
    : source.skills;
  const summary =
    typeof data.summary === "string" &&
    (data.summary === source.bio || source.facts.includes(data.summary))
      ? data.summary
      : source.bio;
  if (data.summary !== undefined && data.summary !== summary)
    violation("summary");
  const highlights = Array.isArray(data.highlights)
    ? data.highlights.filter((s): s is string => {
        if (typeof s !== "string" || !source.facts.includes(s)) {
          violation("highlights");
          return false;
        }
        return true;
      })
    : source.facts;
  return {
    name: source.name,
    email: source.email,
    title: source.title,
    location: source.location,
    experienceYears: source.experienceYears,
    summary,
    highlights: [...new Set(highlights)],
    skills_to_emphasize: [...new Set(skills)],
  };
}
