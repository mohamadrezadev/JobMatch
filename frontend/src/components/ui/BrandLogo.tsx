import Image from "next/image";

const variants = {
  icon: { src: "icon-192", width: 192, height: 192, size: "h-10 w-10" },
  wordmark: { src: "wordmark", width: 1200, height: 267, size: "w-44" },
  full: { src: "full", width: 1200, height: 280, size: "w-full max-w-xl" },
  vertical: { src: "vertical", width: 640, height: 632, size: "w-52" },
} as const;

export function BrandLogo({
  variant = "icon",
  className,
  priority = false,
}: {
  variant?: keyof typeof variants;
  className?: string;
  priority?: boolean;
}) {
  const asset = variants[variant];
  const full = variant === "full" || variant === "vertical";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${variant === "icon" ? "" : "rounded-2xl bg-[#f8fbff] p-3"} ${className ?? asset.size}`}
    >
      <Image
        src={`/brand/karmatch-${asset.src}.png`}
        alt={
          full ? "KarMatch — مهارت‌های تو، فرصت مناسب تو." : "KarMatch — کارمچ"
        }
        width={asset.width}
        height={asset.height}
        className="block h-auto w-full object-contain"
        priority={priority}
        unoptimized
      />
    </span>
  );
}
