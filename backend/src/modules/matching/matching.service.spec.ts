import { MatchingService } from "./matching.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("Personal match eligibility", () => {
  it("checks the owner's saved resume before returning a score", async () => {
    const prisma = {
      job: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            requiredSkills: [{ name: "Excel" }],
            experienceLevel: "Junior",
            location: "تهران",
            workType: "OnSite",
          }),
      },
      profile: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            experienceYears: 0,
            location: "تهران",
            workType: "OnSite",
          }),
      },
      userSkill: {
        findMany: jest.fn().mockResolvedValue([{ skill: { name: "Excel" } }]),
      },
      resume: { count: jest.fn().mockResolvedValue(0) },
    };
    const service = new MatchingService(prisma as unknown as PrismaService);
    expect(await service.calculateMatch("owner", "job")).toMatchObject({
      matchScore: null,
      reason: "RESUME_REQUIRED",
    });
    expect(prisma.resume.count).toHaveBeenCalledWith({
      where: { userId: "owner" },
    });
    prisma.resume.count.mockResolvedValue(1);
    expect(await service.calculateMatch("owner", "job")).toMatchObject({
      matchScore: 100,
      status: "partial",
      evidenceCoverage: 90,
    });
  });
});
