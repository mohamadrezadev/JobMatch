import { UsersService } from "./users.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CompleteOnboardingDto } from "./dto/onboarding.dto";
const dto = {
  firstName: "نام",
  lastName: "خانوادگی",
  title: "Backend",
  location: "تهران",
  experienceYears: 0,
  experienceLevel: "Junior",
  workType: "OnSite",
  skills: [{ name: "Node.js", level: "Intermediate" }],
} as CompleteOnboardingDto;
describe("Atomic onboarding", () => {
  const tx = {
    user: { update: jest.fn() },
    userSkill: { deleteMany: jest.fn(), create: jest.fn() },
    skill: { findFirst: jest.fn(), upsert: jest.fn() },
    profile: { upsert: jest.fn() },
    analyticsEvent: { create: jest.fn() },
  };
  let service: UsersService;
  beforeEach(() => {
    jest.resetAllMocks();
    tx.user.update.mockResolvedValue({ id: "u" });
    tx.skill.upsert.mockResolvedValue({ id: "skill" });
    tx.profile.upsert.mockResolvedValue({ isProfileComplete: true });
    service = new UsersService({
      $transaction: jest.fn((callback) => callback(tx)),
    } as unknown as PrismaService);
  });
  it("saves names, zero years, canonical work type and skills together", async () => {
    const saved = await service.completeOnboarding("u", dto);
    expect(saved.profile.isProfileComplete).toBe(true);
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { firstName: "نام", lastName: "خانوادگی" },
      }),
    );
    expect(tx.profile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          workType: "OnSite",
          experienceYears: 0,
        }),
      }),
    );
  });
  it("propagates failed writes without marking profile complete", async () => {
    tx.userSkill.create.mockRejectedValue(new Error("database failure"));
    await expect(service.completeOnboarding("u", dto)).rejects.toThrow(
      "database failure",
    );
    expect(tx.profile.upsert).not.toHaveBeenCalled();
    expect(tx.analyticsEvent.create).not.toHaveBeenCalled();
  });
  it("rejects whitespace required values before transaction", async () => {
    await expect(
      service.completeOnboarding("u", { ...dto, title: " " }),
    ).rejects.toThrow();
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
