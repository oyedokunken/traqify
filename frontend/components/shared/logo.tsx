import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ href = "/", size = "md", className, iconOnly = false }: LogoProps) {
  const sizes = {
    sm: { box: "w-6 h-6 rounded-md", svg: 12, text: "text-base" },
    md: { box: "w-8 h-8 rounded-lg", svg: 15, text: "text-xl" },
    lg: { box: "w-10 h-10 rounded-xl", svg: 18, text: "text-2xl" },
  };

  const s = sizes[size];

  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("bg-[#DE1010] flex items-center justify-center flex-shrink-0", s.box)}>
        <svg width={s.svg} height={s.svg} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white"/>
          <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
          <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
          <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white"/>
        </svg>
      </span>
      {!iconOnly && (
        <span className={cn("font-bold tracking-tight text-[#0a0a0a]", s.text)}>
          Traq<span className="text-[#DE1010]">ify</span>
        </span>
      )}
    </span>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}