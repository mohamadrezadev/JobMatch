import {
  equivalentOccupationTitles,
  matchesOccupationTitle,
  titleTokens,
} from "./occupation-title";

describe("Occupation title equivalence", () => {
  it.each([
    ["حسابدار", "Senior Accountant", "Sales Specialist"],
    ["کارشناس حسابداری", "Accounting Specialist", "Accounting Manager"],
    ["مدیر حسابداری", "Accounting Manager", "Accountant"],
    ["کارشناس منابع انسانی", "HR Specialist", "HR Manager"],
    ["مدیر منابع انسانی", "Human Resources Manager", "HR Specialist"],
    ["کارشناس فروش", "Sales Representative", "Sales Manager"],
    ["مدیر فروش", "Sales Manager", "Sales Specialist"],
    ["کارشناس بازاریابی", "Marketing Specialist", "Sales Specialist"],
    ["مدیر محصول", "Senior Product Manager", "Project Manager"],
    ["طراح رابط کاربری", "UI Designer", "UX Researcher"],
    ["طراح تجربه کاربری", "User Experience Designer", "UI Designer"],
    ["طراح رابط و تجربه کاربری", "UI/UX Designer", "UX Researcher"],
    ["پژوهشگر تجربه کاربری", "UX Researcher", "UX Designer"],
    ["طراح گرافیک", "Graphic Designer", "Product Designer"],
    ["مهندس مکانیک", "Mechanical Engineer", "Electrical Engineer"],
    ["مهندس برق", "Electrical Engineer", "Civil Engineer"],
    ["مهندس عمران", "Civil Engineer", "Mechanical Engineer"],
    ["پرستار", "Registered Nurse", "Nursing Assistant"],
    ["مهندس داده", "Data Engineer", "Data Analyst"],
    ["تحلیلگر داده", "Data Analyst", "Data Engineer"],
    ["Backend Developer", "برنامه‌نویس بک‌اند", "Frontend Developer"],
    ["Frontend Developer", "برنامه نویس فرانت اند", "Backend Developer"],
    ["Full Stack Developer", "برنامه نویس فول استک", "Backend Developer"],
    ["Node.js Developer", "برنامه نویس نود", "Python Developer"],
    ["React Developer", "برنامه نویس ری‌اکت", "ReactQuery Specialist"],
    ["Python Developer", "برنامه نویس پایتون", "Java Developer"],
    ["Java Developer", "برنامه نویس جاوا", "JavaScript Developer"],
    ["JavaScript Developer", "برنامه نویس جاوااسکریپت", "Java Developer"],
    [
      "TypeScript Developer",
      "برنامه نویس تایپ اسکریپت",
      "JavaScript Developer",
    ],
    [".NET Developer", "برنامه نویس دات نت", "Networking Specialist"],
    ["DevOps Engineer", "مهندس دواپس", "Data Engineer"],
  ])(
    "matches %s bilingually and rejects an unrelated title",
    (role, title, wrong) => {
      expect(matchesOccupationTitle(title, role)).toBe(true);
      expect(matchesOccupationTitle(role, title.replace(/^Senior /, ""))).toBe(
        true,
      );
      expect(matchesOccupationTitle(wrong, role)).toBe(false);
      expect(equivalentOccupationTitles(role)).toContain(role);
    },
  );

  it.each([
    ["حسابدار مالیاتی", "حسابدار مالیاتی ارشد", "حسابدار"],
    [
      "Senior Java Developer",
      "Senior برنامه نویس جاوا",
      "Junior Java Developer",
    ],
    [
      "Mechanical Design Engineer",
      "Senior Mechanical Design Engineer",
      "Mechanical Engineer",
    ],
    [
      "Medical Device Technician",
      "Medical Device Service Technician",
      "Medical Sales Representative",
    ],
    ["Sales Manager", "مدیر فروش", "Sales Specialist"],
    ["حسابدار", "کارشناس حسابداری", "مدیر حسابداری"],
    ["Accountant", "Accounting Specialist", "Accounting Manager"],
    ["UX Researcher", "Senior UX / Researcher", "UX Designer"],
  ])("preserves qualifiers and unknown titles: %s", (role, matching, wrong) => {
    expect(matchesOccupationTitle(matching, role)).toBe(true);
    expect(matchesOccupationTitle(wrong, role)).toBe(false);
  });

  it("preserves qualifiers in equivalent queries", () => {
    expect(equivalentOccupationTitles("حسابدار مالیاتی")).toContain(
      "Accountant مالیاتی",
    );
    expect(equivalentOccupationTitles("Medical Device Technician")).toEqual([
      "Medical Device Technician",
    ]);
  });

  it.each([".NET", "ASP.NET", "C#", "داتنت", "دات‌نت", "dot net"])(
    "recognizes grounded .NET technology evidence: %s",
    (title) => {
      expect(matchesOccupationTitle(title, ".NET Developer")).toBe(true);
    },
  );

  it("normalizes letters and punctuation without collapsing technology boundaries", () => {
    expect(titleTokens("  مهندس مكانيك‌ / Senior. ")).toEqual([
      "مهندس",
      "مکانیک",
      "senior",
    ]);
    expect(titleTokens("C# / C++ / .NET / Node.js")).toEqual([
      "c#",
      "c++",
      ".net",
      "node.js",
    ]);
    expect(
      matchesOccupationTitle("JavaScript Developer", "Java Developer"),
    ).toBe(false);
    expect(matchesOccupationTitle("Node.js Developer", "Node.js")).toBe(true);
    expect(matchesOccupationTitle("Accountant", " ")).toBe(false);
    expect(matchesOccupationTitle("", "Accountant")).toBe(false);
  });
});
