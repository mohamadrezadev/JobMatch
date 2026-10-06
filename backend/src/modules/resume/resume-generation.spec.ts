import OpenAI from "openai";
import { ResumeService } from "./resume.service";
import { PrismaService } from "../../prisma/prisma.service";
jest.mock("openai", () => jest.fn());

describe("Live-model resume response parsing", () => {
  let create: jest.Mock, service: ResumeService;
  const tx = {
    resume: { upsert: jest.fn() },
    resumeProposal: { create: jest.fn() },
    analyticsEvent: { create: jest.fn() },
  };
  const db = {
    job: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    profile: { findUnique: jest.fn() },
    userSkill: { findMany: jest.fn() },
    resumeBase: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const content = {
    summary: "Registered bio",
    highlights: ["Built a financial report"],
    skills_to_emphasize: ["Excel"],
  };
  beforeEach(() => {
    jest.resetAllMocks();
    create = jest.fn();
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create } },
    }));
    db.job.findUnique.mockResolvedValue({
      title: "Accountant",
      description: "Prepare financial statements and reconcile bank accounts.",
      requiredSkills: ["Excel"],
    });
    db.user.findUnique.mockResolvedValue({
      firstName: "Actual",
      lastName: "User",
      email: "actual@example.test",
    });
    db.profile.findUnique.mockResolvedValue({
      isProfileComplete: true,
      title: "Accountant",
      location: "Tehran",
      bio: content.summary,
      resumeFacts: content.highlights,
      experienceYears: 3,
    });
    db.userSkill.findMany.mockResolvedValue([{ skill: { name: "Excel" } }]);
    db.resumeBase.findUnique.mockResolvedValue({
      id: "base",
      version: 2,
      content: {
        ...content,
        name: "Actual User",
        email: "actual@example.test",
        title: "Accountant",
        location: "Tehran",
        experienceYears: 3,
      },
    });
    db.$transaction.mockImplementation((callback) => callback(tx));
    tx.resumeProposal.create.mockResolvedValue({ id: "resume" });
    service = new ResumeService(db as unknown as PrismaService);
  });
  it.each(["plain", "fenced", "unlabeled fence"])(
    "persists grounded facts from %s JSON",
    async (format) => {
      const json = JSON.stringify(content);
      const text =
        format === "plain"
          ? json
          : `\n\`\`\`${format === "fenced" ? "json" : ""}\n${json}\n\`\`\`\n`;
      create.mockResolvedValue({ choices: [{ message: { content: text } }] });
      await expect(service.generate("owner", "job")).resolves.toEqual({
        id: "resume",
      });
      expect(tx.resumeProposal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: expect.objectContaining({
              ...content,
            }),
            baseVersion: 2,
          }),
        }),
      );
      expect(tx.resume.upsert).not.toHaveBeenCalled();
      expect(
        JSON.parse(create.mock.calls[0][0].messages[1].content).target
          .description,
      ).toContain("reconcile bank accounts");
      expect(create).toHaveBeenCalledWith(expect.any(Object), {
        timeout: 30000,
        maxRetries: 0,
      });
    },
  );
  it.each(["", "not json", "{}", "[]", "null"])(
    "rejects unusable output without saving a fabricated successful resume: %s",
    async (text) => {
      create.mockResolvedValue({ choices: [{ message: { content: text } }] });
      await expect(service.generate("owner", "job")).rejects.toMatchObject({
        status: 503,
      });
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it("retains profile validation before invoking the model", async () => {
    db.profile.findUnique.mockResolvedValue({ isProfileComplete: false });
    await expect(service.generate("owner", "job")).rejects.toMatchObject({
      status: 400,
    });
    expect(create).not.toHaveBeenCalled();
  });
  it("requires an explicitly saved base and does not invent one during generation", async () => {
    db.resumeBase.findUnique.mockResolvedValue(null);
    await expect(service.generate("owner", "job")).rejects.toMatchObject({
      status: 400,
    });
    expect(create).not.toHaveBeenCalled();
  });
});
