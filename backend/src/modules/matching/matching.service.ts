import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { matchJob } from "./domain/match";

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}
  async calculateMatch(userId: string, jobId: string) {
    const [job, profile, skills, resumeCount] = await Promise.all([
      this.prisma.job.findUnique({ where: { id: jobId } }),
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.userSkill.findMany({
        where: { userId },
        include: { skill: true },
      }),
      this.prisma.resume.count({ where: { userId } }),
    ]);
    if (!job) throw new NotFoundException("فرصت شغلی یافت نشد.");
    return matchJob(
      profile,
      skills.map((s) => s.skill.name),
      job,
      resumeCount > 0,
    );
  }
  explainMatch(userId: string, jobId: string) {
    return this.calculateMatch(userId, jobId);
  }
  async getSkillGaps(userId: string, jobId: string) {
    const result = await this.calculateMatch(userId, jobId);
    return { gaps: result.skillGaps, score: result.matchScore };
  }
}
