'use client';

import { Badge } from '@/components/ui/Badge';

interface Props {
  skill: string;
}

export function SkillGapBadge({ skill }: Props) {
  return (
    <Badge variant="warning">⚠ {skill}</Badge>
  );
}

export function SkillMatchBadge({ skill }: Props) {
  return (
    <Badge variant="success">✓ {skill}</Badge>
  );
}
