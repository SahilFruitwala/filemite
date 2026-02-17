import React from "react";

type GlowColor = "primary" | "emerald" | "amber" | "teal" | "zinc";

interface BackgroundGlowProps {
  color?: GlowColor;
}

const colorMap: Record<GlowColor, string> = {
  primary: "bg-primary",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  teal: "bg-teal-500",
  zinc: "bg-zinc-500",
};

export default function BackgroundGlow({
  color = "primary",
}: BackgroundGlowProps) {
  return (
    <div
      className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] ${colorMap[color]} opacity-[0.08] blur-[120px] rounded-full pointer-events-none z-[-1] transition-colors duration-500`}
    ></div>
  );
}
