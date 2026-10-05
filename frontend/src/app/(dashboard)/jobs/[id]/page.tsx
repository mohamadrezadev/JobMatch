'use client';
import { useParams } from 'next/navigation';
import { JobsView } from '@/components/pathly/JobsView';
export default function JobDetailPage() { const { id } = useParams<{ id: string }>(); return <JobsView initialJobId={id} />; }
