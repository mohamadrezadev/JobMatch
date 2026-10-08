import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateProfileDto, AddSkillDto } from "./dto/users.dto";
import { CompleteOnboardingDto } from "./dto/onboarding.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
    if (!profile) throw new NotFoundException("Profile not found");
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { firstName, lastName, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (firstName !== undefined || lastName !== undefined)
        await tx.user.update({
          where: { id: userId },
          data: { firstName, lastName },
        });
      const existing = await tx.profile.findUnique({ where: { userId } });
      const data = {
        ...fields,
        workType:
          dto.workType === "On-site" ? ("OnSite" as const) : dto.workType,
      };
      const merged = {
        ...existing,
        ...Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== undefined),
        ),
      };
      const skillCount = await tx.userSkill.count({ where: { userId } });
      const isProfileComplete = Boolean(
        merged.title?.trim() &&
        merged.location?.trim() &&
        merged.experienceYears != null &&
        merged.experienceLevel &&
        merged.workType &&
        skillCount,
      );
      return tx.profile.upsert({
        where: { userId },
        update: { ...data, isProfileComplete },
        create: { userId, ...data, isProfileComplete },
      });
    });
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    if (
      ![dto.firstName, dto.lastName, dto.title, dto.location].every((value) =>
        value.trim(),
      ) ||
      dto.skills.some((skill) => !skill.name.trim())
    )
      throw new BadRequestException("اطلاعات ضروری را کامل کنید.");
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      });
      const {
        firstName: _firstName,
        lastName: _lastName,
        skills,
        ...fields
      } = dto;
      const data = {
        ...fields,
        workType:
          fields.workType === "On-site" ? ("OnSite" as const) : fields.workType,
        isProfileComplete: true,
      };
      await tx.userSkill.deleteMany({ where: { userId } });
      const names = new Set<string>();
      for (const entry of skills) {
        const name = entry.name.trim();
        if (names.has(name.toLowerCase())) continue;
        names.add(name.toLowerCase());
        const existing = await tx.skill.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
        });
        const skill =
          existing ??
          (await tx.skill.upsert({
            where: { name },
            update: {},
            create: { name, category: "Programming" },
          }));
        await tx.userSkill.create({
          data: { userId, skillId: skill.id, level: entry.level },
        });
      }
      const profile = await tx.profile.upsert({
        where: { userId },
        update: data,
        create: { userId, ...data },
      });
      await tx.analyticsEvent.create({
        data: { userId, name: "Onboarding Completed" },
      });
      return { user, profile };
    });
  }

  async getPreferences(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    return {
      workType: profile?.workType ?? null,
      desiredSalary: profile?.desiredSalary ?? null,
      location: profile?.location ?? null,
    };
  }

  async getUserSkills(userId: string) {
    return this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async addSkill(userId: string, dto: AddSkillDto) {
    const name = dto.skillName.trim();
    if (!name) throw new BadRequestException("نام مهارت را وارد کنید.");
    const existing = await this.prisma.skill.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    const skill =
      existing ??
      (await this.prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name, category: "Programming" },
      }));
    return this.prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId: skill.id } },
      update: { level: dto.level || "Intermediate" },
      create: { userId, skillId: skill.id, level: dto.level || "Intermediate" },
      include: { skill: true },
    });
  }

  async removeSkill(userId: string, skillId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.userSkill.deleteMany({ where: { userId, skillId } });
      if (!(await tx.userSkill.count({ where: { userId } })))
        await tx.profile.updateMany({
          where: { userId },
          data: { isProfileComplete: false },
        });
    });
    return { success: true };
  }
}
