// Preferred query titles come first; short aliases also recognize real postings.
// This is an equivalence catalog, not an allowlist of supported occupations.
const families: readonly (readonly string[])[] = [
  [
    "حسابدار",
    "Accountant",
    "کارشناس حسابداری",
    "Accounting Specialist",
    "حسابداری",
    "Accounting",
  ],
  ["مدیر حسابداری", "Accounting Manager"],
  [
    "کارشناس منابع انسانی",
    "HR Specialist",
    "Human Resources Specialist",
    "متخصص منابع انسانی",
  ],
  ["مدیر منابع انسانی", "HR Manager", "Human Resources Manager"],
  ["کارشناس فروش", "Sales Specialist", "Sales Representative", "نماینده فروش"],
  ["مدیر فروش", "Sales Manager"],
  ["کارشناس بازاریابی", "Marketing Specialist", "متخصص بازاریابی"],
  ["مدیر محصول", "Product Manager"],
  ["طراح رابط کاربری", "UI Designer", "User Interface Designer"],
  ["طراح تجربه کاربری", "UX Designer", "User Experience Designer"],
  ["طراح رابط و تجربه کاربری", "UI/UX Designer", "UI UX Designer"],
  ["پژوهشگر تجربه کاربری", "UX Researcher", "User Experience Researcher"],
  ["طراح گرافیک", "Graphic Designer", "گرافیست"],
  ["مهندس مکانیک", "Mechanical Engineer"],
  ["مهندس برق", "Electrical Engineer"],
  ["مهندس عمران", "Civil Engineer"],
  ["پرستار", "Nurse", "Registered Nurse"],
  ["مهندس داده", "Data Engineer"],
  ["تحلیلگر داده", "Data Analyst"],
  [
    "Backend Developer",
    "برنامه نویس بک اند",
    "توسعه دهنده بک اند",
    "Backend",
    "Back End",
    "بک اند",
    "بکاند",
  ],
  [
    "Frontend Developer",
    "برنامه نویس فرانت اند",
    "توسعه دهنده فرانت اند",
    "Frontend",
    "Front End",
    "فرانت اند",
    "فرانت",
  ],
  [
    "Full Stack Developer",
    "برنامه نویس فول استک",
    "توسعه دهنده فول استک",
    "Full Stack",
    "Fullstack",
    "فول استک",
  ],
  [
    "Node.js Developer",
    "برنامه نویس نود",
    "Node.js",
    "Nodejs",
    "Node JS",
    "نود",
  ],
  ["React Developer", "برنامه نویس ری اکت", "React", "ری اکت", "ریاکت"],
  ["Python Developer", "برنامه نویس پایتون", "Python", "پایتون"],
  ["Java Developer", "برنامه نویس جاوا", "Java", "جاوا"],
  [
    "JavaScript Developer",
    "برنامه نویس جاوااسکریپت",
    "JavaScript",
    "جاوااسکریپت",
  ],
  [
    "TypeScript Developer",
    "برنامه نویس تایپ اسکریپت",
    "TypeScript",
    "تایپ اسکریپت",
  ],
  [
    ".NET Developer",
    "برنامه نویس دات نت",
    "توسعه دهنده دات نت",
    ".NET",
    "ASP.NET",
    "Dotnet",
    "Dot Net",
    "دات نت",
    "داتنت",
    "سی شارپ",
    "C#",
  ],
  ["DevOps Engineer", "مهندس دواپس", "DevOps", "دواپس"],
];

export function titleTokens(value: string): string[] {
  return (
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[يى]/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/[\u200c\u200d]/g, " ")
      .replace(/[^\p{L}\p{N}+#.]+/gu, " ")
      // A sentence-ending dot is punctuation; .NET and Node.js keep their dots.
      .replace(/\.(?=\s|$)/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => (word === "حسابداری" ? "حسابدار" : word))
  );
}

const catalog = families
  .flatMap((family) =>
    family.map((alias) => ({ family, terms: titleTokens(alias) })),
  )
  .sort((a, b) => b.terms.length - a.terms.length);

function resolveRole(role: string) {
  const terms = titleTokens(role);
  const words = new Set(terms);
  const match = catalog.find((entry) =>
    entry.terms.every((term) => words.has(term)),
  );
  return {
    terms,
    family: match?.family,
    qualifiers: match
      ? terms.filter((term) => !match.terms.includes(term))
      : [],
  };
}

export function matchesOccupationTitle(title: string, role: string): boolean {
  const resolved = resolveRole(role);
  if (!resolved.terms.length) return false;
  const actual = new Set(titleTokens(title));
  if (!resolved.family) return resolved.terms.every((term) => actual.has(term));
  return (
    resolved.qualifiers.every((term) => actual.has(term)) &&
    resolved.family.some((alias) => {
      const terms = titleTokens(alias);
      return (
        terms.every((term) => actual.has(term)) &&
        // A more specific occupation such as Accounting Manager must not
        // pass through its shared broad word "Accounting".
        !catalog.some(
          (entry) =>
            entry.family !== resolved.family &&
            entry.terms.length > terms.length &&
            terms.every((term) => entry.terms.includes(term)) &&
            entry.terms.every((term) => actual.has(term)),
        )
      );
    })
  );
}

export function equivalentOccupationTitles(role: string): string[] {
  const { family, qualifiers } = resolveRole(role);
  if (!family) return [role];
  return [
    role,
    ...family
      .slice(0, 3)
      .map((alias) => [alias, ...qualifiers].join(" ").trim()),
  ];
}
