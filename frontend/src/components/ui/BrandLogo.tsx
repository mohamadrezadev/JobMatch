import Image from 'next/image';

export function BrandLogo({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <Image
      src="/jobmatch-logo.svg"
      alt="لوگوی جاب مچ"
      width={64}
      height={64}
      className={`shrink-0 ${className}`}
      unoptimized
    />
  );
}
