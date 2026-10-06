import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SubmitFeedbackDto } from "./dto/feedback.dto";

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(userId: string, dto: SubmitFeedbackDto) {
    if (dto.rating === "NotInterested" && !dto.reason)
      throw new BadRequestException("دلیل عدم علاقه را انتخاب کنید.");
    if (!(await this.prisma.job.findUnique({ where: { id: dto.jobId } })))
      throw new NotFoundException("فرصت شغلی یافت نشد.");
    const feedback = await this.prisma.jobFeedback.create({
      data: {
        userId,
        jobId: dto.jobId,
        rating: dto.rating,
        reason: dto.reason,
        notes: dto.notes,
      },
      include: { job: true },
    });
    await this.prisma.analyticsEvent.create({
      data: {
        userId,
        name: dto.rating === "Interested" ? "Job Interested" : "Job Rejected",
        resourceId: dto.jobId,
      },
    });
    return feedback;
  }

  async getHistoryForJob(userId: string, jobId: string) {
    return this.prisma.jobFeedback.findMany({
      where: { userId, jobId },
      orderBy: { createdAt: "desc" },
    });
  }
}
