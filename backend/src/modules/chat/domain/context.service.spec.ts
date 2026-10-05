import { ContextService, normalize } from "./context.service";
import { emptyContext } from "./conversation";

describe("Career Copilot extraction", () => {
  const extractor = new ContextService();
  const run = (message: string) => extractor.extract(message, emptyContext());
  it("extracts the full Persian PRD example", () => {
    const { context, intent } = run(
      "یه کار بک‌اند Node دورکار بالای ۱۵ تومن می‌خوام.",
    );
    expect(intent).toBe("JOB_SEARCH");
    expect(context.searchContext).toMatchObject({
      targetRoles: ["Backend Developer", "Node.js Developer"],
      preferredSkills: ["Node.js"],
      workTypes: ["Remote"],
      minimumSalary: 15000000,
      currency: "TOMAN",
    });
    expect(context.candidateFacts.skills).toEqual([]);
  });
  it("does not require or invent optional preferences", () => {
    expect(run("کار بک‌اند می‌خوام").context.searchContext).toEqual({
      targetRoles: ["Backend Developer"],
    });
  });
  it("keeps context across the three PRD messages without mutating its input", () => {
    const first = run("کار بک‌اند می‌خوام").context;
    const second = extractor.extract("فقط دورکار", first);
    const third = extractor.extract("Node بهتره", second.context);
    expect(first.searchContext.workTypes).toBeUndefined();
    expect(third.intent).toBe("UPDATE_SEARCH");
    expect(third.context.searchContext).toMatchObject({
      targetRoles: ["Backend Developer", "Node.js Developer"],
      workTypes: ["Remote"],
      preferredSkills: ["Node.js"],
    });
  });
  it("replaces salary and work type, preserving the role", () => {
    const first = run("Backend remote 10 million").context;
    const second = extractor.extract("حضوری حداقل ۲۰ میلیون", first);
    expect(second.context.searchContext).toMatchObject({
      targetRoles: ["Backend Developer"],
      workTypes: ["OnSite"],
      minimumSalary: 20000000,
    });
  });
  it.each(["۱۰ میلیون", "١٠ میلیون", "10 million", "10000000 تومان"])(
    "normalizes salary: %s",
    (message) => {
      expect(run(message).context.searchContext.minimumSalary).toBe(10000000);
    },
  );
  it("does not treat a bare quantity as salary", () => {
    expect(run("۱۵").context.searchContext.minimumSalary).toBeUndefined();
  });
  it("does not silently convert unsupported currency", () => {
    expect(
      run("10 million USD").context.searchContext.minimumSalary,
    ).toBeUndefined();
  });
  it("removes optional salary when requested", () => {
    const first = run("Backend 15 million").context;
    const second = extractor.extract("حقوق مهم نیست", first);
    expect(second.context.searchContext.minimumSalary).toBeUndefined();
    expect(second.context.searchContext.currency).toBeUndefined();
  });
  it("separates positive candidate skills from search preferences", () => {
    const result = run("Node.js بلد هستم");
    expect(result.intent).toBe("PROFILE_UPDATE");
    expect(result.context.candidateFacts.skills).toEqual(["Node.js"]);
    expect(result.context.searchContext.targetRoles).toEqual([]);
  });
  it("updates explicit skill denials without search exclusions", () => {
    const first = run("Python بلد هستم").context;
    const second = extractor.extract("Python بلد نیستم", first);
    expect(second.intent).toBe("PROFILE_UPDATE");
    expect(second.context.candidateFacts.skills).toEqual([]);
    expect(second.context.candidateFacts.deniedSkills).toEqual(["Python"]);
    expect(second.context.searchContext.excludedSkills).toBeUndefined();
  });
  it("stores only explicitly stated experience years", () => {
    expect(run("۲ سال سابقه دارم").context.candidateFacts.experienceYears).toBe(
      2,
    );
    const project = run("یه پروژه فروشگاه اینترنتی ساختم");
    expect(project.context.candidateFacts.statements).toEqual([
      "یه پروژه فروشگاه اینترنتی ساختم",
    ]);
    expect(project.context.candidateFacts.experienceYears).toBeUndefined();
    expect(project.context.candidateFacts.skills).toEqual([]);
  });
  it("can process a fact and a preference in one message", () => {
    const result = run("Node بلد هستم و کار بک‌اند دورکار می‌خوام");
    expect(result.context.candidateFacts.skills).toEqual(["Node.js"]);
    expect(result.context.searchContext.targetRoles).toEqual([
      "Backend Developer",
    ]);
    expect(result.context.searchContext.workTypes).toEqual(["Remote"]);
  });
  it("replaces roles explicitly", () => {
    const first = run("Backend").context;
    expect(
      extractor.extract("React به جای بک‌اند", first).context.searchContext
        .targetRoles,
    ).toEqual(["React Developer"]);
  });
  it("separates excluded search skills from candidate facts", () => {
    const first = run("Backend Python").context;
    const result = extractor.extract("بدون Python", first);
    expect(result.context.searchContext.excludedSkills).toEqual(["Python"]);
    expect(result.context.candidateFacts.deniedSkills).toEqual([]);
  });
  it.each([
    ["برای این آگهی رزومه بساز", "RESUME_BUILD"],
    ["جزئیات این آگهی", "JOB_DETAILS"],
    ["این آگهی رو دوست ندارم", "JOB_FEEDBACK"],
    ["چطور مسیر شغلی انتخاب کنم؟", "GENERAL_CAREER_QUESTION"],
    ["دنبال کار هستم", "JOB_SEARCH"],
  ])("classifies %s", (message, intent) =>
    expect(run(message).intent).toBe(intent),
  );
  it("normalizes letters and separators", () =>
    expect(normalize("بك‌اند ١٥")).toBe("بک اند 15"));
});

describe("Conservative extraction boundaries", () => {
  const extractor = new ContextService();
  it.each([
    "برای آگهی Node رزومه بساز",
    "جزئیات آگهی React",
    "چطور Python یاد بگیرم؟",
  ])("does not turn non-search intent into preferences: %s", (message) => {
    expect(
      extractor.extract(message, emptyContext()).context.searchContext
        .targetRoles,
    ).toEqual([]);
  });
  it("does not turn an English skill denial into a search preference", () => {
    const result = extractor.extract("I don't know Python", emptyContext());
    expect(result.context.candidateFacts.deniedSkills).toEqual(["Python"]);
    expect(result.context.searchContext.targetRoles).toEqual([]);
  });
  it("does not assert a skill from a learning aspiration", () => {
    expect(
      extractor.extract("می‌خوام Node بلد باشم", emptyContext()).context
        .candidateFacts.skills,
    ).toEqual([]);
  });
  it("supports role replacement wording in either order", () => {
    const first = extractor.extract("Backend", emptyContext()).context;
    expect(
      extractor.extract("به جای بک‌اند React", first).context.searchContext
        .targetRoles,
    ).toEqual(["React Developer"]);
    expect(
      extractor.extract("React instead of Backend", first).context.searchContext
        .targetRoles,
    ).toEqual(["React Developer"]);
  });
});
