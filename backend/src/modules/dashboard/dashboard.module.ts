import { Controller, Get, Module, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JobsModule } from "../jobs/jobs.module";
import { JobsService } from "../jobs/jobs.service";

@Controller("api/dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}
  @Get()
  async get(@CurrentUser() user: { sub: string }) {
    const userId = user.sub;
    const [
      profile,
      skills,
      recommendations,
      discoveries,
      conversations,
      resumeCount,
      feedback,
      activity,
    ] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.userSkill.count({ where: { userId } }),
      this.jobs.getRecommended(userId),
      this.prisma.jobDiscoveryRun.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 5,
      }),
      this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          updatedAt: true,
          messages: {
            orderBy: { sequence: "desc" },
            take: 1,
            select: { content: true },
          },
        },
      }),
      this.prisma.resume.count({ where: { userId } }),
      this.prisma.jobFeedback.findMany({
        where: { userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: { job: true },
      }),
      this.prisma.analyticsEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);
    const latest = new Map<string, (typeof feedback)[number]>();
    for (const entry of feedback)
      if (!latest.has(entry.jobId)) latest.set(entry.jobId, entry);
    const interested = [...latest.values()].filter(
      (f) => f.rating === "Interested",
    );
    const fields = [
      profile?.title,
      profile?.location,
      profile?.experienceYears != null,
      profile?.experienceLevel,
      profile?.workType,
      skills > 0,
    ];
    return {
      profileCompletion: Math.round(
        (fields.filter(Boolean).length / fields.length) * 100,
      ),
      recommendations,
      recentDiscoveries: discoveries,
      recentConversations: conversations,
      resumeCount,
      interestedCount: interested.length,
      interestedJobs: interested.slice(0, 5).map((f) => f.job),
      recentActivity: activity,
    };
  }
}
@Module({ imports: [JobsModule], controllers: [DashboardController] })
export class DashboardModule {}
