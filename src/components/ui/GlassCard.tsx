import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export default function GlassCard({
  children,
  className = "",
  hoverEffect = true,
}: GlassCardProps) {
  return (
    <div
      className={`relative bg-surface border-2 border-border shadow-[4px_4px_0px_0px_var(--color-border)] max-w-full ${
        hoverEffect
          ? "group hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--color-border)] transition-all duration-200"
          : ""
      } ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
