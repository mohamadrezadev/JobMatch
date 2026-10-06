import { ResumeService } from "./resume.service";
import { PrismaService } from "../../prisma/prisma.service";
describe("Owned persisted resumes", () => {
  const db = {
    resume: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    profile: { findUnique: jest.fn() },
    userSkill: { findMany: jest.fn() },
  };
  let service: ResumeService;
  beforeEach(() => {
    jest.resetAllMocks();
    service = new ResumeService(db as unknown as PrismaService);
    db.user.findUnique.mockResolvedValue({
      firstName: "Actual",
      lastName: "User",
      email: "actual@example.test",
    });
    db.profile.findUnique.mockResolvedValue({
      isProfileComplete: true,
      title: "Backend",
      location: "Tehran",
      bio: "Registered bio",
      resumeFacts: [],
      experienceYears: 1,
    });
    db.userSkill.findMany.mockResolvedValue([{ skill: { name: "Node.js" } }]);
  });
  it("does not reveal foreign IDs on read or update", async () => {
    db.resume.findFirst.mockResolvedValue(null);
    await expect(service.getById("owner", "foreign")).rejects.toThrow(
      "رزومه یافت نشد",
    );
    await expect(
      service.update("owner", "foreign", {
        summary: "",
        highlights: [],
        skills_to_emphasize: [],
      }),
    ).rejects.toThrow();
    expect(db.resume.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "foreign", userId: "owner" } }),
    );
    expect(db.resume.update).not.toHaveBeenCalled();
  });
  it("sanitizes legacy fabricated prose before display", async () => {
    db.resume.findFirst.mockResolvedValue({
      id: "r",
      content: {
        summary: "Google director",
        skills_to_emphasize: ["Kubernetes"],
        companies: ["Google"],
      },
    });
    const result = await service.getById("owner", "r");
    expect(JSON.stringify(result.content)).not.toMatch(/Google|Kubernetes/);
    expect(result.content.summary).toBe("Registered bio");
  });
  it("preserves explicit user edits, invalidates PDF and increments version", async () => {
    db.resume.findFirst.mockResolvedValue({ id: "r", content: {} });
    await service.update("owner", "r", {
      summary: "User-authored biography",
      highlights: ["User project"],
      skills_to_emphasize: ["node.js"],
    });
    expect(db.resume.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "r", userId: "owner" },
        data: expect.objectContaining({
          version: { increment: 1 },
          pdfPath: null,
          content: expect.objectContaining({
            provenance: "user-authored",
            skills_to_emphasize: ["Node.js"],
          }),
        }),
      }),
    );
  });
  it("requires registration of new skills before saving", async () => {
    db.resume.findFirst.mockResolvedValue({ id: "r", content: {} });
    await expect(
      service.update("owner", "r", {
        summary: "",
        highlights: [],
        skills_to_emphasize: ["Kubernetes"],
      }),
    ).rejects.toThrow("مهارت جدید");
    expect(db.resume.update).not.toHaveBeenCalled();
  });
});
