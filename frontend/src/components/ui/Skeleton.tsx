export function Skeleton({ className }: { className?: string }) {
  return <div className={className ?? 'h-4 w-full rounded-md animate-pulse bg-gray-200'} />;
}
