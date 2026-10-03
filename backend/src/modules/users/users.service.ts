import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto, AddSkillDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, avatar: true } } },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.profile.upsert({
      where: { userId },
      update: {
        title: dto.title,
        bio: dto.bio,
        location: dto.location,
        desiredSalary: dto.desiredSalary,
        experienceYears: dto.experienceYears,
        experienceLevel: dto.experienceLevel,
        workType: dto.workType === 'On-site' ? 'OnSite' : dto.workType,
        socialLinks: dto.socialLinks,
        isProfileComplete: true,
      },
      create: {
        userId,
        title: dto.title,
        bio: dto.bio,
        location: dto.location,
        desiredSalary: dto.desiredSalary,
        experienceYears: dto.experienceYears,
        experienceLevel: dto.experienceLevel,
        workType: dto.workType === 'On-site' ? 'OnSite' : dto.workType,
        socialLinks: dto.socialLinks,
        isProfileComplete: true,
      },
    });
    return profile;
  }

  async getUserSkills(userId: string) {
    return this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addSkill(userId: string, dto: AddSkillDto) {
    const skill = await this.prisma.skill.findFirst({ where: { name: dto.skillName } });
    if (!skill) {
      const created = await this.prisma.skill.create({ data: { name: dto.skillName, category: 'Programming' } });
      return this.prisma.userSkill.create({
        data: { userId, skillId: created.id, level: dto.level || 'Intermediate' },
        include: { skill: true },
      });
    }
    return this.prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId: skill.id } },
      update: { level: dto.level || 'Intermediate' },
      create: { userId, skillId: skill.id, level: dto.level || 'Intermediate' },
      include: { skill: true },
    });
  }

  async removeSkill(userId: string, skillId: string) {
    await this.prisma.userSkill.deleteMany({ where: { userId, skillId } });
    return { success: true };
  }
}
