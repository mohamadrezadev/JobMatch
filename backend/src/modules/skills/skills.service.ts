import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    return this.prisma.skill.findMany({ orderBy: { name: 'asc' } });
  }
}
