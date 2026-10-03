import { PrismaClient, SkillCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed Skills
  const skills = [
    { name: 'C#', category: SkillCategory.Programming },
    { name: 'JavaScript', category: SkillCategory.Programming },
    { name: 'TypeScript', category: SkillCategory.Programming },
    { name: 'Python', category: SkillCategory.Programming },
    { name: '.NET', category: SkillCategory.Framework },
    { name: 'ASP.NET Core', category: SkillCategory.Framework },
    { name: 'React', category: SkillCategory.Framework },
    { name: 'Next.js', category: SkillCategory.Framework },
    { name: 'Node.js', category: SkillCategory.Framework },
    { name: 'Flutter', category: SkillCategory.Framework },
    { name: 'SQL Server', category: SkillCategory.Tool },
    { name: 'PostgreSQL', category: SkillCategory.Tool },
    { name: 'MongoDB', category: SkillCategory.Tool },
    { name: 'Git', category: SkillCategory.Tool },
    { name: 'Docker', category: SkillCategory.Tool },
    { name: 'Redis', category: SkillCategory.Tool },
    { name: 'REST API', category: SkillCategory.Tool },
    { name: 'GraphQL', category: SkillCategory.Tool },
    { name: 'CI/CD', category: SkillCategory.Tool },
    { name: 'Agile', category: SkillCategory.Soft },
    { name: 'Communication', category: SkillCategory.Soft },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: {},
      create: skill,
    });
  }

  // Seed Sample Jobs
  const jobs = [
    {
      title: 'Junior .NET Developer',
      company: 'TechCorp',
      location: 'Tehran',
      workType: 'Remote' as const,
      experienceLevel: 'Junior',
      salaryMin: 15000000,
      salaryMax: 25000000,
      description: 'We are looking for a Junior .NET Developer to join our team.',
      requiredSkills: [{ name: 'C#', weight: 2 }, { name: '.NET', weight: 2 }, { name: 'SQL Server', weight: 2 }],
      preferredSkills: [{ name: 'Azure', weight: 1 }],
      source: 'LinkedIn',
      sourceUrl: 'https://linkedin.com/jobs/example',
    },
    {
      title: 'Frontend Developer',
      company: 'WebStudio',
      location: 'Remote',
      workType: 'Remote' as const,
      experienceLevel: 'Junior',
      salaryMin: 12000000,
      salaryMax: 20000000,
      description: 'Join our frontend team building modern web applications.',
      requiredSkills: [{ name: 'JavaScript', weight: 2 }, { name: 'React', weight: 2 }, { name: 'TypeScript', weight: 2 }],
      preferredSkills: [{ name: 'Next.js', weight: 1 }, { name: 'Tailwind CSS', weight: 1 }],
      source: 'Indeed',
      sourceUrl: null,
    },
    {
      title: 'Backend Developer',
      company: 'DataFlow',
      location: 'Hybrid',
      workType: 'Hybrid' as const,
      experienceLevel: 'Mid',
      salaryMin: 20000000,
      salaryMax: 35000000,
      description: 'Build scalable backend services and APIs.',
      requiredSkills: [{ name: 'Node.js', weight: 2 }, { name: 'TypeScript', weight: 2 }, { name: 'PostgreSQL', weight: 2 }],
      preferredSkills: [{ name: 'Docker', weight: 1 }, { name: 'Redis', weight: 1 }],
      source: 'Company Website',
      sourceUrl: null,
    },
  ];

  for (const job of jobs) {
    await prisma.job.create({
      data: job,
    });
  }

  console.log(`Seeded ${skills.length} skills and ${jobs.length} jobs`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
