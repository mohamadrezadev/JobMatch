import { Injectable, NotFoundException } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ResumeService {
  private openai?: OpenAI;

  constructor(private readonly prisma: PrismaService) {}

  async generate(userId: string, jobId: string) {
    const [job, profile, userSkills] = await Promise.all([
      this.prisma.job.findUnique({ where: { id: jobId } }),
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.userSkill.findMany({ where: { userId }, include: { skill: true } }),
    ]);

    if (!job) throw new NotFoundException('Job not found');
    if (!profile?.isProfileComplete) {
      throw new NotFoundException('Profile is incomplete. Please complete your profile first.');
    }

    const prompt = `Generate a professional resume for this job application.

USER PROFILE:
- Name: ${profile.title ?? 'N/A'}
- Location: ${profile.location ?? 'N/A'}
- Experience: ${profile.experienceYears ?? 0} years
- Desired salary: ${profile.desiredSalary ?? 'Not specified'}

VERIFIED SKILLS ONLY (use these exact skills, do NOT invent others):
${userSkills.map((us) => `- ${us.skill.name} (${us.level}, ${us.yearsOfExperience ?? 0} years)`).join('\n')}

TARGET JOB:
${job.title} at ${job.company}
Requirements: ${(job.requiredSkills as any[]).map((s: any) => s.name).join(', ')}

RULES:
1. Use ONLY the verified skills above - NEVER fabricate skills
2. Never invent companies, projects, or achievements
3. Tailor the language to emphasize relevance to this specific role
4. Output JSON: { "summary": "...", "highlights": ["..."], "skills_to_emphasize": ["..."] }`;

    try {
      this.openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      const aiContent = response.choices[0]?.message?.content ?? '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(aiContent);
      } catch {
        parsed = { summary: aiContent, highlights: [], skills_to_emphasize: [] };
      }

      // Integrity guard: only keep skills that are in the user's verified set
      const verifiedSkills = new Set(userSkills.map((us) => us.skill.name.toLowerCase()));
      const sanitized = {
        ...parsed,
        skills_to_emphasize: Array.isArray(parsed.skills_to_emphasize)
          ? parsed.skills_to_emphasize.filter((s: string) => verifiedSkills.has(s.toLowerCase()))
          : [],
      };

      const resume = await this.prisma.resume.upsert({
        where: { userId_jobId: { userId, jobId } },
        update: { content: sanitized },
        create: { userId, jobId, content: sanitized },
      });

      return resume;
    } catch (error) {
      console.error('OpenAI generation error:', error);
      throw new Error('Failed to generate resume. Please try again.');
    }
  }

  async getByJob(userId: string, jobId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { userId_jobId: { userId, jobId } },
      include: { job: true },
    });
    if (!resume) throw new NotFoundException('Resume not found for this job');
    return resume;
  }

  async getPDF(userId: string, jobId: string) {
    const resume = await this.getByJob(userId, jobId);
    // In production, render using @react-pdf/renderer
    // For MVP, return the structured content for client-side rendering
    return {
      content: resume.content,
      jobId,
      note: 'PDF rendering to be implemented with @react-pdf/renderer',
    };
  }
}
