import { feedbackModifier, RankFeedback } from "./recommendation";
const job = {
  requiredSkills: [{ name: ".NET" }],
  location: "Tehran",
  workType: "OnSite",
  experienceLevel: "Mid",
  company: "Company",
};
const feedback = (
  id: string,
  rating = "Interested",
  reason: string | null = null,
): RankFeedback => ({ jobId: id, rating, reason, job });
describe("Feedback ranking", () => {
  it("uses three distinct jobs rather than repeated clicks", () => {
    expect(
      feedbackModifier(job, [feedback("1"), feedback("1"), feedback("1")]),
    ).toBe(0);
    expect(feedbackModifier(job, [feedback("1"), feedback("2")])).toBe(0);
  });
  it("caps positive and negative adjustments", () => {
    expect(
      feedbackModifier(
        job,
        ["1", "2", "3", "4"].map((id) => feedback(id)),
      ),
    ).toBe(0.15);
    expect(
      feedbackModifier(
        job,
        ["1", "2", "3", "4"].map((id) =>
          feedback(id, "NotInterested", "Technology"),
        ),
      ),
    ).toBe(-0.15);
  });
  it("uses latest feedback and reason-specific work type penalties", () => {
    const entries = [
      feedback("1", "NotInterested", "JobType"),
      feedback("1"),
      feedback("2", "NotInterested", "Salary"),
      feedback("3", "NotInterested", "Other"),
    ];
    expect(feedbackModifier(job, entries)).toBe(-0.05);
    expect(feedbackModifier({ ...job, workType: "Remote" }, entries)).toBe(0);
  });
  it('penalizes comparable salary offers without inventing salary for unknown jobs', () => {
    const rejected = { ...job, salaryMin: 30000000, currency: 'TOMAN', salaryPeriod: 'MONTHLY' };
    const entries = ['1', '2', '3'].map(id => ({ ...feedback(id, 'NotInterested', 'Salary'), job: rejected }));
    expect(feedbackModifier({ ...rejected, salaryMin: 20000000 }, entries)).toBe(-.15);
    expect(feedbackModifier({ ...rejected, salaryMin: null }, entries)).toBe(0);
  });
});
