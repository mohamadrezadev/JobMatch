import { canonicalSearchIntent } from "./canonical-search-intent";

describe("Compound backend technology requests", () => {
  it.each([
    "بکند دات نت",
    "بک‌اند دات‌نت",
    "Backend .NET Developer",
    "ASP.NET Backend Developer",
    "برنامه نویس بک اند سی شارپ",
  ])("splits %s without changing other conditions", (role) => {
    const goal = {
      targetRoles: [role],
      requestedCount: 10,
      locations: ["Tehran"],
      requiredSkills: ["SQL"],
    };
    const result = canonicalSearchIntent(goal);
    expect(result).toEqual({
      ...goal,
      targetRoles: ["Backend Developer"],
      requiredSkills: ["SQL", ".NET"],
    });
    expect(goal.targetRoles).toEqual([role]);
    expect(canonicalSearchIntent(result)).toEqual(result);
  });
  it.each([
    "Senior Backend .NET Architect",
    "حسابدار",
    "Backend Node.js Developer",
  ])("retains unknown qualifiers and other occupations: %s", (role) => {
    expect(canonicalSearchIntent({ targetRoles: [role] })).toEqual({
      targetRoles: [role],
    });
  });
});
