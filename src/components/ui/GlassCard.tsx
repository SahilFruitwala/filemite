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
      className={`relative bg-surface border border-border/50 shadow-sm rounded-2xl overflow-hidden max-w-full ${
        hoverEffect
          ? "group hover:shadow-md transition-all duration-300 hover:border-border"
          : ""
      } ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
