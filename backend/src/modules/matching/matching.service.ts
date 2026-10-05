import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface MatchBreakdown {
  skills: { score: number; matched: string[]; missing: string[] };
  experience: { score: number; details: string };
  location: { score: number; details: string };
  salary: { score: number; details: string };
}

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateMatch(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const userSkillNames = new Set(userSkills.map((us) => us.skill.name.toLowerCase()));
    const requiredSkills = (job.requiredSkills as any[]) || [];

    const matchedSkills = requiredSkills.filter((s) => userSkillNames.has(s.name.toLowerCase()));
    const missingSkills = requiredSkills.filter((s) => !userSkillNames.has(s.name.toLowerCase()));

    const skillWeightsSum = requiredSkills.reduce((sum, s) => sum + (s.weight ?? 2), 0);
    const matchedWeights = matchedSkills.reduce((sum, s) => sum + (s.weight ?? 2), 0);
    const skillScore = skillWeightsSum > 0 ? (matchedWeights / skillWeightsSum) * 100 : 100;

    // Experience match (approximate)
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    let expScore = 50;
    let expDetails = 'Experience not set';
    if (profile?.experienceYears != null) {
      expScore = Math.min(100, (profile.experienceYears * 20) / Math.max(1, parseInt(job.experienceLevel) || 1));
      expDetails = `${profile.experienceYears} years vs required ${job.experienceLevel}`;
    }

    // Location match
    let locScore = 100;
    let locDetails = 'Remote-compatible';
    if (profile?.location && job.location !== 'Remote') {
      locScore = profile.location === job.location ? 100 : 40;
      locDetails = locScore === 100 ? `Same city: ${job.location}` : 'Different city';
    }

    // Salary match
    let salScore = 100;
    let salDetails = 'No salary specified';
    if (profile?.desiredSalary && job.salaryMin != null) {
      const expected = profile.desiredSalary;
      const mid = (job.salaryMin + (job.salaryMax ?? job.salaryMin)) / 2;
      salScore = mid >= expected ? 100 : Math.round((mid / expected) * 100);
      salDetails = salScore === 100 ? 'Within expectations' : 'Below expectation';
    }

    const matchScore = Math.round(
      (skillScore * 0.6 + expScore * 0.2 + locScore * 0.1 + salScore * 0.1),
    );

    const breakdown: MatchBreakdown = {
      skills: { score: Math.round(skillScore), matched: matchedSkills.map((s) => s.name), missing: missingSkills.map((s) => s.name) },
      experience: { score: Math.round(expScore), details: expDetails },
      location: { score: Math.round(locScore), details: locDetails },
      salary: { score: Math.round(salScore), details: salDetails },
    };

    return {
      matchScore,
      breakdown,
      skillGaps: missingSkills.map((s) => s.name),
    };
  }

  async explainMatch(userId: string, jobId: string) {
    const result = await this.calculateMatch(userId, jobId);
    const parts = [
      `You have ${result.breakdown.skills.matched.length} of ${result.breakdown.skills.matched.length + result.breakdown.skills.missing.length} required skills.`,
    ];
    if (result.skillGaps.length > 0) {
      parts.push(`Missing: ${result.skillGaps.join(', ')}.`);
    }
    return { explanation: parts.join(' '), ...result };
  }

  async getSkillGaps(userId: string, jobId: string) {
    const result = await this.calculateMatch(userId, jobId);
    return { gaps: result.skillGaps, score: result.matchScore };
  }
}
