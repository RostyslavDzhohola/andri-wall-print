import Link from "next/link";

import { cn } from "@/lib/utils";

const iconSizes = {
  sm: "size-9",
  md: "size-11",
  lg: "size-16"
} as const;

type BrandMarkProps = {
  ariaLabel?: string;
  className?: string;
  href?: string | null;
  iconSize?: keyof typeof iconSizes;
  label?: string;
  showText?: boolean;
  textClassName?: string;
};

export function BrandMark({
  ariaLabel,
  className,
  href = "/",
  iconSize = "md",
  label = "Wall Print Pro",
  showText = true,
  textClassName
}: BrandMarkProps) {
  const content = (
    <>
      <img
        alt=""
        className={cn("shrink-0 rounded-full object-cover", iconSizes[iconSize])}
        draggable={false}
        height={160}
        src="/brand/wallprint-pro-mark-160.png"
        width={160}
      />
      {showText ? <span className={cn("leading-tight", textClassName)}>{label}</span> : null}
    </>
  );

  const sharedClassName = cn(
    "inline-flex items-center gap-2 border-0 font-semibold transition hover:text-primary focus-visible:text-primary focus-visible:underline focus-visible:decoration-2 focus-visible:underline-offset-4 focus-visible:outline-none",
    className
  );

  if (href === null) {
    return <div className={sharedClassName}>{content}</div>;
  }

  return (
    <Link aria-label={ariaLabel ?? `${label} homepage`} className={sharedClassName} href={href}>
      {content}
    </Link>
  );
}
