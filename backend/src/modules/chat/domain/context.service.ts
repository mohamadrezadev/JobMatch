import { ChatIntent, ConversationContext } from "./conversation";

const roles: Array<[RegExp, string, string?]> = [
  [/بک\s*ا?ند|back\s*end/i, "Backend Developer"],
  [/فرانت\s*اند|front\s*end/i, "Frontend Developer"],
  [/فول\s*استک|full\s*stack/i, "Full Stack Developer"],
  [/(^|[^a-z])node(?:\.js)?(?=$|[^a-z])/i, "Node.js Developer", "Node.js"],
  [/(^|[^a-z])react(?=$|[^a-z])/i, "React Developer", "React"],
  [/(^|[^a-z])python(?=$|[^a-z])/i, "Python Developer", "Python"],
  [/(^|[^a-z])java(?=$|[^a-z])/i, "Java Developer", "Java"],
  [/(^|[^a-z])typescript(?=$|[^a-z])/i, "TypeScript Developer", "TypeScript"],
  [/(^|[^a-z])javascript(?=$|[^a-z])/i, "JavaScript Developer", "JavaScript"],
  [
    /\.net(?=$|[^a-z])|(?:^|[^a-z])dot\s*net(?=$|[^a-z])|دات\s*نت|سی\s*شارپ|c#/i,
    ".NET Developer",
    ".NET",
  ],
  [/طراح\s*(?:رابط|تجربه)|ux\s*designer|ui\s*designer/i, "UI/UX Designer"],
];
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d-]/g, " ")
    .replace(/٫/g, ".")
    .replace(/٬/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const unique = (values: string[]) => [...new Set(values)];
const factPattern =
  /بلد|نمی دانم|don't know|do not know|سابقه دار|تجربه دار|ساختم|دانشجو|فارغ التحصیل|i (?:know|have|built|am)|years? (?:of )?experience/i;

export class ContextService {
  extract(
    message: string,
    previous: ConversationContext,
  ): { context: ConversationContext; intent: ChatIntent; understood: boolean } {
    const context: ConversationContext = JSON.parse(JSON.stringify(previous));
    const search = context.searchContext;
    const facts = context.candidateFacts;
    const text = normalize(message);
    const directIntent: ChatIntent | undefined =
      /رزومه.*(?:بساز|ساخت|آگهی)|(?:build|create|generate).*resume/.test(text)
        ? "RESUME_BUILD"
        : /جزئیات.*(?:آگهی|شغل)|(?:job|listing).*details/.test(text)
          ? "JOB_DETAILS"
          : /این (?:آگهی|شغل).*(?:نمی پسند|نمی خوام|دوست|مناسب)|(?:like|dislike).*this job/.test(
                text,
              )
            ? "JOB_FEEDBACK"
            : /چطور|چگونه|چیست|how (?:can|do|to)|what is/.test(text)
              ? "GENERAL_CAREER_QUESTION"
              : undefined;
    if (directIntent)
      return { context, intent: directIntent, understood: false };
    let preference = false;
    let fact = false;
    let roleChanged = false;
    const clauses = text
      .split(/\s+و\s+|[؛;!?\n]|\.(?=\s|$)/)
      // Keep skill lists intact, but separate salary preferences from a
      // comma-delimited profile statement so one cannot hide the other.
      .flatMap((clause) =>
        /حداقل|حقوق|salary|minimum/.test(clause)
          ? clause.split(/[,،]/)
          : [clause],
      )
      .filter(Boolean);
    for (const clause of clauses) {
      if (factPattern.test(clause)) {
        fact = true;
        for (const [pattern, , skill] of roles) {
          if (!skill || !pattern.test(clause)) continue;
          const denied = /بلد نیست|نمی دانم|don't know|do not know/i.test(
            clause,
          );
          if (denied) {
            facts.skills = facts.skills.filter((s) => s !== skill);
            facts.deniedSkills = unique([...facts.deniedSkills, skill]);
          } else if (/بلد هستم|بلد هستیم|بلدم(?:\s|$)|i know/i.test(clause)) {
            facts.skills = unique([...facts.skills, skill]);
            facts.deniedSkills = facts.deniedSkills.filter((s) => s !== skill);
          }
        }
        const years = clause.match(
          /(\d+(?:\.\d+)?)\s*(?:سال\s*(?:سابقه|تجربه)|years? (?:of )?experience)/,
        );
        if (years) facts.experienceYears = Number(years[1]);
        continue;
      }
      const matched = roles.filter(([pattern]) => pattern.test(clause));
      if (matched.length) {
        preference = true;
        const excluded =
          /بدون|نمی خوام|نمی خواهم|نمیخوام|don't want|without|exclude/i.test(
            clause,
          );
        const replacing = /به جای|عوض|instead|rather than/i.test(clause);
        if (replacing) {
          // The last named role is the requested replacement; do not retain the old role.
          const ordered = matched.sort(
            (a, b) => clause.search(a[0]) - clause.search(b[0]),
          );
          const marker = clause.search(/به جای|instead|rather than/);
          const beforeMarker = ordered.filter(
            ([pattern]) => clause.search(pattern) < marker,
          );
          const selected = beforeMarker.length
            ? beforeMarker[beforeMarker.length - 1]
            : ordered[ordered.length - 1];
          search.targetRoles = [selected[1]];
          search.preferredSkills = selected[2] ? [selected[2]] : [];
        } else {
          for (const [, role, skill] of matched) {
            if (excluded) {
              search.targetRoles = search.targetRoles.filter((r) => r !== role);
              if (skill) {
                search.preferredSkills = (search.preferredSkills ?? []).filter(
                  (s) => s !== skill,
                );
                search.excludedSkills = unique([
                  ...(search.excludedSkills ?? []),
                  skill,
                ]);
              }
            } else {
              search.targetRoles = unique([...search.targetRoles, role]);
              if (skill) {
                search.preferredSkills = unique([
                  ...(search.preferredSkills ?? []),
                  skill,
                ]);
                search.excludedSkills = (search.excludedSkills ?? []).filter(
                  (s) => s !== skill,
                );
              }
            }
          }
        }
        roleChanged = true;
      }
      const work: Array<[RegExp, "Remote" | "Hybrid" | "OnSite"]> = [
        [/دورکار|remote/, "Remote"],
        [/هیبرید|hybrid/, "Hybrid"],
        [/حضوری|on\s*site/, "OnSite"],
      ];
      const positive: Array<"Remote" | "Hybrid" | "OnSite"> = [];
      for (const [pattern, value] of work) {
        const match = pattern.exec(clause);
        if (!match) continue;
        const after = clause.slice(match.index + match[0].length);
        const before = clause.slice(0, match.index);
        const negative =
          /^\s*(?:نمی خوام|نمی خواهم|نمیخوام|نباش|نه)/.test(after) ||
          /(?:بدون|not|no)\s*$/.test(before);
        if (negative)
          search.workTypes = (search.workTypes ?? []).filter(
            (w) => w !== value,
          );
        else positive.push(value);
        preference = true;
      }
      if (positive.length) search.workTypes = positive;
      if (
        /حقوق.*(?:مهم نیست|محدودیت ندار)|(?:بدون حداقل حقوق)|no salary minimum/.test(
          clause,
        )
      ) {
        delete search.minimumSalary;
        delete search.currency;
        preference = true;
      } else {
        const salary = clause.match(
          /(\d+(?:\.\d+)?)\s*(میلیون|million|تومن|تومان|toman)/,
        );
        if (salary && !/دلار|ریال|usd|rial/.test(clause)) {
          const number = Number(salary[1]);
          const amount =
            /میلیون|million/.test(salary[2]) || number < 1000
              ? number * 1000000
              : number;
          if (Number.isFinite(amount) && amount > 0 && amount <= 100000000000) {
            search.minimumSalary = amount;
            search.currency = "TOMAN";
            preference = true;
          }
        }
      }
      const locations = [
        ["تهران", "Tehran"],
        ["tehran", "Tehran"],
        ["اصفهان", "Isfahan"],
        ["شیراز", "Shiraz"],
        ["مشهد", "Mashhad"],
      ]
        .filter(([name]) => clause.includes(name))
        .map(([, name]) => name);
      if (locations.length) {
        const negative = /نباش|نمی خوام|نمی خواهم|not in|exclude/.test(clause);
        search.locations = negative
          ? (search.locations ?? []).filter(
              (location) => !locations.includes(location),
            )
          : unique(locations);
        preference = true;
      }
      const level = /جونیور|junior/.test(clause)
        ? "Junior"
        : /سینیور|senior/.test(clause)
          ? "Senior"
          : /mid\s*level|میدلول/.test(clause)
            ? "Mid"
            : undefined;
      if (level) {
        search.experienceLevel = level;
        preference = true;
      }
    }
    if (fact) facts.statements = unique([...facts.statements, message]);
    let intent: ChatIntent;
    if (
      /رزومه.*(?:بساز|ساخت|آگهی)|(?:build|create|generate).*resume/.test(text)
    )
      intent = "RESUME_BUILD";
    else if (/جزئیات.*(?:آگهی|شغل)|(?:job|listing).*details/.test(text))
      intent = "JOB_DETAILS";
    else if (
      /این (?:آگهی|شغل).*(?:نمی پسند|نمی خوام|دوست|مناسب)|(?:like|dislike).*this job/.test(
        text,
      )
    )
      intent = "JOB_FEEDBACK";
    else if (fact && !preference) intent = "PROFILE_UPDATE";
    else if (preference)
      intent = previous.searchContext.targetRoles.length
        ? "UPDATE_SEARCH"
        : "JOB_SEARCH";
    else if (
      /کار.*(?:می خوام|میخوام|می خواهم)|دنبال کار|find.*job|looking for.*job/.test(
        text,
      )
    )
      intent = "JOB_SEARCH";
    else intent = "GENERAL_CAREER_QUESTION";
    // Role changes only reflect the user's words; candidate skills never imply a search role.
    return { context, intent, understood: preference || fact || roleChanged };
  }
}
