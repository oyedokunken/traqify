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
    sm: { icon: "w-6 h-6 text-xs rounded-md", text: "text-base" },
    md: { icon: "w-8 h-8 text-sm rounded-lg", text: "text-xl" },
    lg: { icon: "w-10 h-10 text-base rounded-xl", text: "text-2xl" },
  };

  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("bg-[#DE1010] flex items-center justify-center font-bold text-white flex-shrink-0", sizes[size].icon)}>
        <svg viewBox="0 0 20 20" fill="none" className="w-3/5 h-3/5">
          <path d="M3 4h14v3.5h-5v8.5H8V7.5H3z" fill="white"/>
          <circle cx="15" cy="15" r="3" fill="white" opacity="0.7"/>
        </svg>
      </span>
      {!iconOnly && (
        <span className={cn("font-bold tracking-tight text-[#0a0a0a]", sizes[size].text)}>
          Traq<span className="text-[#DE1010]">ify</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
