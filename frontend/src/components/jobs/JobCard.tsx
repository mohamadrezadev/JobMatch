import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Job } from '@/types/job';

interface Props {
  job: Job;
}

export function JobCard({ job }: Props) {
  const skills = (job.requiredSkills as { name: string }[]).map((s) => s.name);

  return (
    <Link href={`/jobs/${job.id}`} className="block transition-shadow hover:shadow-md">
      <Card className="h-full">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{job.title}</h3>
            <p className="text-sm text-gray-500">{job.company}</p>
          </div>
          <Badge variant={job.workType === 'Remote' ? 'success' : 'default'}>
            {job.workType}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {skills.slice(0, 5).map((skill) => (
            <Badge key={skill}>{skill}</Badge>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>{job.location}</span>
          <span>{job.experienceLevel}</span>
        </div>
      </Card>
    </Link>
  );
}
