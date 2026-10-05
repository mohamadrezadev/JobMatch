import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = 12) {
    const [items, total] = await Promise.all([
      this.prisma.job.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { lastSeenAt: 'desc' } }),
      this.prisma.job.count(),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async search(keyword?: string, page = 1, limit = 12) {
    const where = keyword
      ? {
          OR: [
            { title: { contains: keyword } },
            { description: { contains: keyword } },
            { company: { contains: keyword } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.job.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { lastSeenAt: 'desc' } }),
      this.prisma.job.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async getRecommended() {
    return this.prisma.job.findMany({ orderBy: { lastSeenAt: 'desc' }, take: 5 });
  }
}
