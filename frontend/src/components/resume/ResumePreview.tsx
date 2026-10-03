'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ResumeData {
  summary?: string;
  highlights?: string[];
  skills_to_emphasize?: string[];
}

interface Props {
  content: ResumeData;
  jobId: string;
  onDownloadPdf: (jobId: string) => void;
}

export function ResumePreview({ content, jobId, onDownloadPdf }: Props) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="mb-1 text-sm font-semibold uppercase text-gray-500">Professional Summary</h3>
          <p className="text-sm text-gray-700">{content.summary ?? 'No summary generated yet.'}</p>
        </div>
        {content.highlights && content.highlights.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-semibold uppercase text-gray-500">Key Highlights</h3>
            <ul className="list-inside list-disc text-sm text-gray-700">
              {content.highlights.map((h: string, i: number) => <li key={i}>{h}</li>)}
            </ul>
          </div>
        )}
        {content.skills_to_emphasize && content.skills_to_emphasize.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-semibold uppercase text-gray-500">Emphasized Skills</h3>
            <div className="flex flex-wrap gap-1">
              {content.skills_to_emphasize.map((s: string) => (
                <span key={s} className="rounded bg-brand-100 px-2 py-0.5 text-xs text-brand-700">{s}</span>
              ))}
            </div>
          </div>
        )}
        <Button onClick={() => onDownloadPdf(jobId)}>
          Download PDF
        </Button>
      </div>
    </Card>
  );
}
