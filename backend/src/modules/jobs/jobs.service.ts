import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { SearchJobsDto } from "./dto/jobs.dto";
import { matchJob } from "../matching/domain/match";
import { feedbackModifier } from "./domain/recommendation";
import { jobsWithSkills } from "./infrastructure/skill-search";

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}
  list(page = 1, limit = 12) {
    return this.search({ page, limit });
  }
  async getById(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("فرصت شغلی یافت نشد.");
    return job;
  }
  async search(dto: SearchJobsDto, userId?: string) {
    const page = dto.page ?? 1,
      limit = dto.pageSize ?? dto.limit ?? 12;
    const and: Prisma.JobWhereInput[] = [];
    const q = (dto.q ?? dto.keyword)?.trim();
    if (q)
      and.push({
        OR: ["title", "description", "company"].map((field) => ({
          [field]: { contains: q, mode: "insensitive" },
        })),
      });
    if (dto.role?.trim())
      and.push({ title: { contains: dto.role.trim(), mode: "insensitive" } });
    if (dto.location?.trim()) {
      const city = dto.location.trim();
      const aliases = /^(tehran|تهران)$/i.test(city)
        ? ["tehran", "تهران"]
        : [city];
      and.push({
        OR: aliases.map((location) => ({
          location: { contains: location, mode: "insensitive" },
        })),
      });
    }
    if (dto.workType)
      and.push({
        workType: dto.workType === "On-site" ? "OnSite" : dto.workType,
      });
    if (dto.experienceLevel)
      and.push({
        experienceLevel: { equals: dto.experienceLevel, mode: "insensitive" },
      });
    if (dto.minimumSalary != null)
      and.push({
        salaryMin: { gte: dto.minimumSalary },
        currency: "TOMAN",
        salaryPeriod: "MONTHLY",
      });
    if (dto.skills) {
      const skills = [
        ...new Set(
          dto.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ];
      if (skills.length)
        and.push({ id: { in: await jobsWithSkills(this.prisma, skills) } });
    }
    const where: Prisma.JobWhereInput = { AND: and };
    const [items, total, profile, skills] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ lastSeenAt: "desc" }, { id: "asc" }],
      }),
      this.prisma.job.count({ where }),
      userId ? this.prisma.profile.findUnique({ where: { userId } }) : null,
      userId
        ? this.prisma.userSkill.findMany({
            where: { userId },
            include: { skill: true },
          })
        : [],
    ]);
    return {
      items: items.map((job) =>
        userId
          ? {
              ...job,
              match: matchJob(
                profile,
                skills.map((s) => s.skill.name),
                job,
              ),
            }
          : job,
      ),
      total,
      page,
      pageSize: limit,
      pages: Math.ceil(total / limit),
    };
  }
  async getRecommended(userId: string) {
    const [jobs, profile, skills, feedback] = await Promise.all([
      this.prisma.job.findMany({
        orderBy: [{ lastSeenAt: "desc" }, { id: "asc" }],
      }),
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.userSkill.findMany({
        where: { userId },
        include: { skill: true },
      }),
      this.prisma.jobFeedback.findMany({
        where: { userId },
        include: { job: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    ]);
    const latest = new Map<string, string>();
    for (const f of feedback)
      if (!latest.has(f.jobId)) latest.set(f.jobId, f.rating);
    return jobs
      .filter((job) => latest.get(job.id) !== "NotInterested")
      .map((job) => {
        const match = matchJob(
          profile,
          skills.map((s) => s.skill.name),
          job,
        );
        const modifier = feedbackModifier(job, feedback);
        return {
          ...job,
          match,
          matchScore: match.matchScore,
          rankingScore:
            Math.round(match.matchScore * (1 + modifier) * 100) / 100,
          personalizationModifier: modifier,
        };
      })
      .sort((a, b) => b.rankingScore - a.rankingScore)
      .slice(0, 5);
  }
}
