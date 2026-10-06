import { matchJob as calculateMatch } from "./match";
const matchJob = (...args: Parameters<typeof calculateMatch>) =>
  calculateMatch(args[0], args[1], args[2], true);
const job = {
  requiredSkills: [{ name: "React" }],
  preferredSkills: [],
  experienceLevel: "Mid",
  location: "Tehran",
  workType: "Hybrid",
  salaryMin: 60000000,
  currency: "TOMAN",
  salaryPeriod: "MONTHLY",
};
const profile = {
  experienceYears: 3,
  experienceLevel: "Mid",
  location: "تهران",
  workType: "Hybrid",
  desiredSalary: 50000000,
};
describe("Explainable matching", () => {
  it("matches names, levels and city aliases with explicit weights", () => {
    const result = matchJob(profile, ["react"], job);
    expect(result.matchScore).toBe(100);
    expect(result.weights).toEqual({
      skills: 60,
      experience: 20,
      location: 5,
      workType: 5,
      salary: 10,
    });
  });
  it("labels unavailable evidence rather than awarding full points", () => {
    const result = matchJob(null, [], {
      ...job,
      requiredSkills: [],
      location: null,
      workType: null,
      experienceLevel: null,
      salaryMin: null,
    });
    expect(result.matchScore).toBeNull();
    expect(result.breakdown.salary.status).toBe("unknown");
    expect(result.breakdown.experience.status).toBe("unknown");
  });
  it("compares minimum salary and treats remote location independently", () => {
    const result = matchJob(profile, ["React"], {
      ...job,
      workType: "Remote",
      location: null,
      salaryMin: 25000000,
    });
    expect(result.breakdown.location.score).toBe(100);
    expect(result.breakdown.workType.score).toBe(0);
    expect(result.breakdown.salary.score).toBe(50);
  });
  it("does not compare unknown salary units", () => {
    expect(
      matchJob(profile, ["React"], { ...job, currency: null }).breakdown.salary
        .status,
    ).toBe("unknown");
  });
  it("weights preferred skills less than required skills", () => {
    const result = matchJob(profile, ["React"], {
      ...job,
      preferredSkills: [{ name: "Docker" }],
    });
    expect(result.breakdown.skills.score).toBe(67);
    expect(result.skillGaps).toEqual([]);
  });
  it("does not award a percentage to an account without a saved resume", () => {
    expect(calculateMatch(profile, ["React"], job)).toMatchObject({
      matchScore: null,
      status: "insufficient_data",
      reason: "RESUME_REQUIRED",
      skillGaps: [],
    });
  });
  it("does not invent candidate skills even when a resume record exists", () => {
    expect(calculateMatch(null, [], job, true)).toMatchObject({
      matchScore: null,
      reason: "PROFILE_REQUIRED",
    });
  });
  it("excludes unknown salary from the weighted score and declares evidence coverage", () => {
    expect(
      matchJob(profile, ["React"], { ...job, salaryMin: null }),
    ).toMatchObject({
      matchScore: 100,
      status: "partial",
      evidenceCoverage: 90,
      breakdown: { salary: { score: null, status: "unknown" } },
    });
  });
  it("withholds a total when the posting has no comparable skill requirements", () => {
    expect(
      matchJob(profile, ["React"], { ...job, requiredSkills: [] }),
    ).toMatchObject({ matchScore: null, reason: "JOB_REQUIREMENTS_UNKNOWN" });
  });
});
