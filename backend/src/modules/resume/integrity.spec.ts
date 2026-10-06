import { guardResume } from "./integrity";
const source = {
  name: "Actual User",
  email: "user@example.test",
  title: "Backend",
  location: "Tehran",
  bio: "Registered biography",
  facts: ["Built a small API"],
  skills: ["Node.js"],
  experienceYears: 1,
};
describe("All-field resume integrity", () => {
  it("drops hallucinated skills, narrative and unexpected credential fields", () => {
    const violations = jest.fn();
    const safe = guardResume(
      {
        name: "Fake",
        title: "CEO",
        experienceYears: 20,
        summary: "Worked at Google with Kubernetes",
        highlights: ["Won an award"],
        skills_to_emphasize: ["Kubernetes", "node.js"],
        education: "MIT",
        companies: ["Google"],
      },
      source,
      violations,
    );
    expect(safe.name).toBe(source.name);
    expect(safe.title).toBe(source.title);
    expect(safe.experienceYears).toBe(1);
    expect(safe.summary).toBe(source.bio);
    expect(safe.skills_to_emphasize).toEqual(["Node.js"]);
    expect(safe.highlights).toEqual([]);
    expect(JSON.stringify(safe)).not.toMatch(/Google|MIT|Kubernetes|CEO|award/);
    expect(violations).toHaveBeenCalled();
  });
  it("retains exact registered factual blocks", () => {
    const violations = jest.fn();
    expect(
      guardResume(
        {
          summary: source.bio,
          highlights: source.facts,
          skills_to_emphasize: source.skills,
        },
        source,
        violations,
      ).highlights,
    ).toEqual(source.facts);
    expect(violations).not.toHaveBeenCalled();
  });
  it("accepts invalid model shapes without exposing them", () => {
    expect(guardResume(null, source, jest.fn()).summary).toBe(source.bio);
    expect(
      guardResume(
        { highlights: [null], skills_to_emphasize: [9] },
        source,
        jest.fn(),
      ).highlights,
    ).toEqual([]);
  });
});
