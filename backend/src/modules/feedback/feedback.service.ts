import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitFeedbackDto } from './dto/feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(userId: string, dto: SubmitFeedbackDto) {
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
    return feedback;
  }

  async getHistoryForJob(userId: string, jobId: string) {
    return this.prisma.jobFeedback.findMany({
      where: { userId, jobId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
