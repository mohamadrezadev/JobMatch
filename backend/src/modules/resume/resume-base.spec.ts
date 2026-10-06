import { ResumeService } from "./resume.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("Base revision and explicit proposal acceptance", () => {
  const content = {
    name: "Actual User",
    email: "actual@example.test",
    title: "Accountant",
    location: "Tehran",
    experienceYears: 3,
    summary: "Saved base bio",
    highlights: ["Base report"],
    skills_to_emphasize: ["Excel"],
  };
  const source = {
    ...content,
    bio: content.summary,
    facts: content.highlights,
    skills: content.skills_to_emphasize,
  };
  const db = {
    user: { findUnique: jest.fn() },
    profile: { findUnique: jest.fn() },
    userSkill: { findMany: jest.fn() },
    resumeBase: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    resumeProposal: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    resume: { findUnique: jest.fn(), findFirst: jest.fn(), upsert: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: ResumeService;
  beforeEach(() => {
    jest.resetAllMocks();
    db.user.findUnique.mockResolvedValue({
      firstName: "Actual",
      lastName: "User",
      email: content.email,
    });
    db.profile.findUnique.mockResolvedValue({
      isProfileComplete: true,
      title: content.title,
      location: content.location,
      experienceYears: 3,
      bio: "Profile bio",
      resumeFacts: ["Profile report"],
    });
    db.userSkill.findMany.mockResolvedValue([{ skill: { name: "Excel" } }]);
    db.$transaction.mockImplementation((callback) => callback(db));
    service = new ResumeService(db as unknown as PrismaService);
  });
  it("restores user-declared base prose rather than overwriting it from profile", async () => {
    db.resumeBase.findUnique.mockResolvedValue({
      id: "base",
      version: 2,
      content,
    });
    expect(await service.getBase("owner")).toMatchObject({
      version: 2,
      content: { summary: content.summary, highlights: content.highlights },
    });
  });
  it("rejects stale base revisions without changing accepted job resumes", async () => {
    db.resumeBase.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.saveBase("owner", {
        version: 1,
        summary: "new",
        highlights: [],
        skills_to_emphasize: ["Excel"],
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(db.resume.upsert).not.toHaveBeenCalled();
  });
  it("does not allow undeclared skills into the base", async () => {
    await expect(
      service.saveBase("owner", {
        version: 0,
        summary: "new",
        highlights: [],
        skills_to_emphasize: ["Kubernetes"],
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.resumeBase.create).not.toHaveBeenCalled();
  });
  it("accepts a source snapshot once and preserves later manual edits on repeated acceptance", async () => {
    db.resumeProposal.findFirst.mockResolvedValue({
      id: "p",
      userId: "owner",
      jobId: "job",
      status: "PROPOSED",
      baseVersion: 2,
      content,
      sourceSnapshot: source,
    });
    db.resume.upsert.mockResolvedValue({ id: "r", content });
    await service.acceptProposal("owner", "p");
    expect(db.resume.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          content: expect.objectContaining({
            provenance: "base-backed",
            baseVersion: 2,
            summary: content.summary,
          }),
        }),
      }),
    );
    db.resumeProposal.findFirst.mockResolvedValue({
      id: "p",
      jobId: "job",
      status: "ACCEPTED",
    });
    const edited = { id: "r", content: { summary: "Owner's later edit" } };
    db.resume.findUnique.mockResolvedValue(edited);
    expect(await service.acceptProposal("owner", "p")).toEqual(edited);
    expect(db.resume.upsert).toHaveBeenCalledTimes(1);
  });
  it("keeps accepted base-backed facts readable after profile or base changes", async () => {
    db.resume.findFirst.mockResolvedValue({
      id: "r",
      content: {
        ...content,
        provenance: "base-backed",
        sourceSnapshot: source,
        baseVersion: 2,
        proposalId: "p",
      },
    });
    expect((await service.getById("owner", "r")).content).toMatchObject({
      summary: content.summary,
      highlights: content.highlights,
    });
  });
  it("rejects a foreign proposal and scopes history to the owner and exact job", async () => {
    db.resumeProposal.findFirst.mockResolvedValue(null);
    await expect(
      service.acceptProposal("other", "foreign"),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.resume.upsert).not.toHaveBeenCalled();
    await service.proposals("owner", "job");
    expect(db.resumeProposal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "owner", jobId: "job" } }),
    );
  });
});
