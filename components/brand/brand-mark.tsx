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
        src="/brand/wallprint-pro-mark.png"
      />
      {showText ? <span className={cn("leading-tight", textClassName)}>{label}</span> : null}
    </>
  );

  const sharedClassName = cn(
    "inline-flex items-center gap-2 rounded-sm font-semibold outline-offset-4 transition hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
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
