'use client';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Props {
  keyword: string;
  onSearch: (keyword: string) => void;
  onClear: () => void;
}

export function JobFilters({ keyword, onSearch, onClear }: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="flex-1">
        <Input
          placeholder="Search by role, company, or technology..."
          value={keyword}
          onChange={(e) => onSearch(e.target.value)}
          label="Search Jobs"
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClear}>Clear</Button>
        <Button onClick={() => onSearch(keyword)}>Search</Button>
      </div>
    </div>
  );
}
