import { DiscoveredJob } from "./discovery";

type ObjectValue = Record<string, unknown>;
// Identify error screens before extraction; normal job descriptions mentioning
// networking or JavaScript must not be classified as browser failures.
export function pageFailureCode(content: string): string | null {
  const header = content
    .slice(0, 1500)
    .replace(/<\/(?:h[1-6]|p|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  if (
    /^\s*(?:#{1,6}\s*)?(?:خطا در اتصال به سرور\s*-\s*)?Connection Error\s*$/im.test(
      header,
    )
  )
    return "PAGE_CONNECTION_ERROR";
  if (
    /^\s*(?:#{1,6}\s*)?(?:مشکل سازگاری مرورگر\s*-\s*)?Javascript Error\s*$/im.test(
      header,
    )
  )
    return "PAGE_JAVASCRIPT_ERROR";
  if (
    /^\s*(?:#{1,6}\s*)?(?:Access Denied|Just a moment\.\.\.|Checking your browser|Verify you are human|دسترسی غیرمجاز)\s*$/im.test(
      header,
    )
  )
    return "PAGE_ACCESS_BLOCKED";
  return content.trim() ? null : "FETCH_EMPTY_CONTENT";
}
export function explicitlyClosed(content: string) {
  const main = content.split(/^###\s+مشاغل مشابه/m)[0];
  return /این (?:آگهی|فرصت شغلی).{0,40}(?:بسته|منقضی|غیرفعال)|مهلت ارسال رزومه.{0,30}پایان/.test(
    main,
  );
}
const object = (value: unknown): ObjectValue =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as ObjectValue)
    : {};
const digits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (ch) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(ch)))
    .replace(/[٠-٩]/g, (ch) => String("٠١٢٣٤٥٦٧٨٩".indexOf(ch)));
export function plainText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 20000) : null;
}
export function workType(value: unknown): DiscoveredJob["workType"] {
  if (typeof value !== "string") return null;
  if (/هیبرید|نیمه[\s‌-]*حضوری|hybrid/i.test(value)) return "Hybrid";
  if (/telecommute|remote|دورکار|ریموت/i.test(value)) return "Remote";
  if (/on[\s_-]*site|حضوری/i.test(value)) return "OnSite";
  return null;
}
export function parseSalary(
  value: unknown,
): Pick<
  DiscoveredJob,
  "salaryMin" | "salaryMax" | "currency" | "salaryPeriod"
> {
  const empty = {
    salaryMin: null,
    salaryMax: null,
    currency: null,
    salaryPeriod: null,
  };
  if (typeof value === "string") {
    const text = digits(value);
    if (/توافقی|ذکر نشده|negotiable/i.test(text) || !/تومان|تومن/i.test(text))
      return empty;
    const amounts = [...text.matchAll(/\d+(?:[.,٬]\d+)*/g)].map((match) =>
      Number(match[0].replace(/[,٬]/g, "")),
    );
    if (
      !amounts.length ||
      amounts.length > 2 ||
      amounts.some((amount) => !Number.isFinite(amount) || amount <= 0)
    )
      return empty;
    const multiplier = /میلیون/.test(text) ? 1000000 : 1;
    const upperOnly =
      amounts.length === 1 && /^(?:\s*)(?:تا|حداکثر)/.test(text);
    return {
      salaryMin: upperOnly ? null : amounts[0] * multiplier,
      salaryMax: upperOnly
        ? amounts[0] * multiplier
        : amounts.length > 1
          ? amounts[1] * multiplier
          : null,
      currency: "TOMAN",
      salaryPeriod: /ماه|monthly|month/i.test(text) ? "MONTHLY" : null,
    };
  }
  const salary = object(value),
    amount = object(salary.value);
  const currency = salary.currency;
  if (!["IRR", "IRT", "TOMAN"].includes(String(currency))) return empty;
  const min = amount.minValue ?? amount.value,
    max = amount.maxValue;
  const number = (raw: unknown) =>
    typeof raw === "number" &&
    Number.isFinite(raw) &&
    raw > 0 &&
    raw < 1000000000000
      ? raw / (currency === "IRR" ? 10 : 1)
      : null;
  return {
    salaryMin: number(min),
    salaryMax: number(max),
    currency: "TOMAN",
    salaryPeriod: /^(MONTH|MONTHLY)$/i.test(String(amount.unitText))
      ? "MONTHLY"
      : null,
  };
}
function postings(value: unknown, depth = 0): ObjectValue[] {
  if (depth > 12) return [];
  if (Array.isArray(value))
    return value.flatMap((item) => postings(item, depth + 1));
  const item = object(value);
  if ([item["@type"]].flat().includes("JobPosting")) return [item];
  return [
    ...postings(item["@graph"], depth + 1),
    ...postings(item.mainEntity, depth + 1),
  ];
}
const skills = (value: unknown) =>
  [
    ...new Set(
      (Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split(/[,،;]/)
          : []
      )
        .map(plainText)
        .filter(
          (skill): skill is string => Boolean(skill) && skill!.length <= 100,
        ),
    ),
  ].slice(0, 50);

export function normalizeJob(
  content: string,
  url: string,
): DiscoveredJob | null {
  if (pageFailureCode(content)) return null;
  let candidates: ObjectValue[] = [];
  for (const match of content.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      candidates.push(...postings(JSON.parse(match[1])));
    } catch {
      /* Malformed untrusted data is discarded. */
    }
  }
  if (!candidates.length) {
    try {
      candidates = postings(JSON.parse(content));
    } catch {
      /* Not a structured posting. */
    }
  }
  const posting = candidates[0];
  if (!posting)
    return (
      jobinjaMarkdown(content, url) ??
      jobinjaText(content, url) ??
      jobvisionMarkdown(content, url) ??
      iranTalentText(content, url) ??
      labeledJob(content, url)
    );
  const title = plainText(posting.title),
    company = plainText(object(posting.hiringOrganization).name);
  if (!title || !company || title.length > 300 || company.length > 300)
    return null;
  const expiry =
    typeof posting.validThrough === "string"
      ? Date.parse(posting.validThrough)
      : NaN;
  if (Number.isFinite(expiry) && expiry < Date.now()) return null;
  const address = object(
    object(
      Array.isArray(posting.jobLocation)
        ? posting.jobLocation[0]
        : posting.jobLocation,
    ).address,
  );
  const salary = parseSalary(posting.baseSalary);
  if (
    salary.salaryMin &&
    salary.salaryMax &&
    salary.salaryMax < salary.salaryMin
  )
    return null;
  const date =
    typeof posting.datePosted === "string" &&
    Number.isFinite(Date.parse(posting.datePosted))
      ? new Date(posting.datePosted).toISOString()
      : null;
  return {
    title,
    company,
    location: plainText(address.addressLocality),
    workType: workType(posting.jobLocationType),
    experienceLevel: plainText(posting.experienceRequirements),
    ...salary,
    description: plainText(posting.description),
    requiredSkills: skills(posting.skills),
    preferredSkills: skills(posting.preferredSkills),
    source: new URL(url).hostname.replace(/^www\./, ""),
    sourceUrl: url,
    publishedAt: date,
  };
}
// The observed Jobvision header is title, posting age, company, location and
// employment type. Only parse this layout on a numeric vacancy URL, never lists.
function jobvisionMarkdown(content: string, url: string): DiscoveredJob | null {
  const target = new URL(url);
  if (
    !/^(?:www\.)?jobvision\.ir$/.test(target.hostname) ||
    !/^\/jobs\/\d+(?:\/|$)/.test(target.pathname)
  )
    return null;
  const main = content.split(
    /^(?:#{1,6}\s*)?(?:موقعیت[‌ ]های شغلی مشابه|Similar Jobs)\s*$/im,
  )[0];
  if (
    explicitlyClosed(main) ||
    /^(?:#{1,6}\s*)?(?:This job (?:is closed|has expired)|Job expired)\s*$/im.test(
      main,
    )
  )
    return null;
  const header =
    /^#\s+([^\n]+)\r?\n\s*\n\((?:\d+\s+(?:days?|hours?|weeks?|months?) ago|today|yesterday)\)\s*\n\s*\n([^\n]+)\s*\n\s*\n([^\n]+)\s*\n\s*\n(Full Time|Part Time|Contract|Internship)\s*$/im.exec(
      main,
    );
  const description = plainText(
    /^##\s+Job Description\s*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/im.exec(
      main,
    )?.[1],
  );
  if (!header || !description) return null;
  const title = plainText(header[1]),
    company = plainText(header[2]),
    location = plainText(header[3]);
  if (
    !title ||
    !company ||
    !location ||
    title.length > 300 ||
    company.length > 300
  )
    return null;
  const requirements =
    /^##\s+key Requirements\s*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/im.exec(
      main,
    )?.[1] ?? "";
  return {
    title,
    company,
    location,
    workType: null,
    experienceLevel: plainText(
      /^([^\n]*years? experience[^\n]*)$/im.exec(requirements)?.[1],
    ),
    ...parseSalary(null),
    description,
    requiredSkills: requirements
      .split(/\r?\n/)
      .flatMap((line) => {
        const match =
          /^(.+?)\s+-\s+(?:Basic|Intermediate|Advanced|Expert)\s*$/i.exec(
            line.trim(),
          );
        const skill = plainText(match?.[1]);
        return skill && skill.length <= 100 ? [skill] : [];
      })
      .slice(0, 50),
    preferredSkills: [],
    source: "jobvision.ir",
    sourceUrl: url,
    publishedAt: null,
  };
}
// TinyFish's Jobinja Markdown retains the primary company/title and labeled
// facts. Keep this bounded to that source and stop before related vacancies.
function jobinjaMarkdown(content: string, url: string): DiscoveredJob | null {
  const target = new URL(url);
  if (
    !/^(?:www\.)?jobinja\.ir$/.test(target.hostname) ||
    !/^\/companies\/[^/]+\/jobs\/[^/]+/.test(target.pathname)
  )
    return null;
  const main = content.split(/^###\s+مشاغل مشابه/m)[0];
  if (explicitlyClosed(main)) return null;
  const titleMatch = /^#\s+(.+)$/m.exec(main);
  if (!titleMatch) return null;
  const company = plainText(
    /^##\s+(.+)$/m.exec(main.slice(0, titleMatch.index))?.[1],
  );
  const title = plainText(titleMatch[1]);
  if (
    !company ||
    !title ||
    company.length > 300 ||
    title.length > 300 ||
    !/^####\s+شرح موقعیت شغلی\s*$/m.test(main)
  )
    return null;
  const section = (label: string) => {
    const match = new RegExp(
      `^(?:\\*\\s+)?####\\s+${label}\\s*\\n([\\s\\S]*?)(?=^(?:\\*\\s+)?#{1,6}\\s|^---|$(?![\\s\\S]))`,
      "m",
    ).exec(main);
    return match?.[1].trim() ?? null;
  };
  const salary = parseSalary(plainText(section("حقوق")));
  if (
    salary.salaryMin &&
    salary.salaryMax &&
    salary.salaryMax < salary.salaryMin
  )
    return null;
  return {
    title,
    company,
    location: plainText(section("موقعیت مکانی")),
    workType: workType(section("نوع همکاری")),
    experienceLevel: plainText(section("حداقل سابقه کار")),
    ...salary,
    description: plainText(section("شرح موقعیت شغلی")),
    requiredSkills: (section("مهارت[‌ ]?های مورد نیاز") ?? "")
      .split(/\r?\n/)
      .map((line) => plainText(line.trim()))
      .filter((line): line is string => Boolean(line) && line!.length <= 100)
      .slice(0, 50),
    preferredSkills: [],
    source: "jobinja.ir",
    sourceUrl: url,
    publishedAt: null,
  };
}
// Rendered text from the same vacancy can arrive without Markdown headings.
function jobinjaText(content: string, url: string): DiscoveredJob | null {
  const target = new URL(url);
  if (
    !/^(?:www\.)?jobinja\.ir$/.test(target.hostname) ||
    !/^\/companies\/[^/]+\/jobs\/[^/]+/.test(target.pathname)
  )
    return null;
  const main = content.split(/^مشاغل مشابه\s*$/m)[0];
  if (explicitlyClosed(main)) return null;
  const titleMatch = /^استخدام[^\n]+$/m.exec(main);
  const companyMatch = /^([^\n]+)\n\s*\|\s*\n([^\n]+)$/m.exec(
    main.slice(0, titleMatch?.index ?? 0),
  );
  if (!titleMatch || !companyMatch) return null;
  const labels =
    "دسته‌بندی شغلی|موقعیت مکانی|نوع همکاری|حداقل سابقه کار|حقوق|شرح موقعیت شغلی|معرفی شرکت|مهارت[‌ ]?های مورد نیاز|جنسیت|وضعیت نظام وظیفه|حداقل مدرک تحصیلی|ثبت آگهی استخدام در جابینجا";
  const section = (label: string) =>
    new RegExp(
      `^${label}\\s*\\n([\\s\\S]*?)(?=^(?:${labels})\\s*$|$(?![\\s\\S]))`,
      "m",
    )
      .exec(main)?.[1]
      .trim() ?? null;
  const description = plainText(section("شرح موقعیت شغلی"));
  const location = plainText(section("موقعیت مکانی"));
  if (!description || !location) return null;
  const title = plainText(titleMatch[0])!,
    company = plainText(companyMatch[1])!;
  if (title.length > 300 || company.length > 300) return null;
  return {
    title,
    company,
    location,
    workType: workType(section("نوع همکاری")),
    experienceLevel: plainText(section("حداقل سابقه کار")),
    ...parseSalary(section("حقوق")),
    description,
    requiredSkills: (section("مهارت[‌ ]?های مورد نیاز") ?? "")
      .split(/\r?\n/)
      .map(plainText)
      .filter(
        (value): value is string => Boolean(value) && value!.length <= 100,
      )
      .slice(0, 50),
    preferredSkills: [],
    source: "jobinja.ir",
    sourceUrl: url,
    publishedAt: null,
  };
}
function iranTalentText(content: string, url: string): DiscoveredJob | null {
  const target = new URL(url);
  if (
    !/^(?:www\.)?irantalent\.com$/.test(target.hostname) ||
    !/^\/(?:en\/)?job\/[^/]+\/\d+\/?$/.test(target.pathname) ||
    explicitlyClosed(content)
  )
    return null;
  const header =
    /^#\s+([^\n]+)\n\s*\n[ \t]*([^\n]+?)\s+(Tehran|تهران)\s*\n\s*\n(?:Posted\b|[^\n]*منتشر شده)/im.exec(
      content,
    );
  const description = plainText(
    /^(?:Job Description|توضیحات)\s*\n([\s\S]*?)(?=^(?:Employment Type|نوع استخدام)\s*$)/m.exec(
      content,
    )?.[1],
  );
  if (!header || !description) return null;
  const section = (label: string) =>
    new RegExp(
      `^(?:${label})\\s*\\n([\\s\\S]*?)(?=^(?:Job Category|Educations|Seniority|Details|گروه شغلی|تحصیلات|رده سازمانی|جزییات)\\s*$|$(?![\\s\\S]))`,
      "m",
    ).exec(content)?.[1];
  const title = plainText(header[1])!,
    company = plainText(header[2])!;
  if (title.length > 300 || company.length > 300) return null;
  return {
    title,
    company,
    location: header[3],
    workType: workType(section("Employment Type|نوع استخدام")),
    experienceLevel: plainText(
      section("Seniority|رده سازمانی")?.replace(/^\*\s*/gm, ""),
    ),
    ...parseSalary(null),
    description,
    requiredSkills: [],
    preferredSkills: [],
    source: "irantalent.com",
    sourceUrl: url,
    publishedAt: null,
  };
}
// Conservative fallback: only explicit labeled values, never a search snippet or generated answer.
function labeledJob(content: string, url: string): DiscoveredJob | null {
  const value = (labels: string) => {
    const match = content.match(
      new RegExp(
        `^(?:#{1,6}\\s*)?(?:\\*\\*)?(?:${labels})(?:\\*\\*)?\\s*[:：]\\s*(.+)$`,
        "im",
      ),
    );
    return plainText(match?.[1]);
  };
  const title = value("عنوان شغلی|Job title"),
    company = value("نام شرکت|شرکت|Company");
  if (!title || !company || title.length > 300 || company.length > 300)
    return null;
  const salary = parseSalary(value("حقوق|Salary"));
  if (
    salary.salaryMin &&
    salary.salaryMax &&
    salary.salaryMax < salary.salaryMin
  )
    return null;
  return {
    title,
    company,
    location: value("شهر|Location"),
    workType: workType(value("نوع حضور|Work type")),
    experienceLevel: null,
    ...salary,
    description: value("شرح شغل|Description"),
    requiredSkills: skills(value("مهارت‌های الزامی|Required skills")),
    preferredSkills: skills(value("مهارت‌های ترجیحی|Preferred skills")),
    source: new URL(url).hostname.replace(/^www\./, ""),
    sourceUrl: url,
    publishedAt: null,
  };
}
