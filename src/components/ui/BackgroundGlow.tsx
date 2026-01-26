import React from 'react';

type GlowColor = 'primary' | 'emerald' | 'indigo' | 'blue' | 'purple' | 'cyan';

interface BackgroundGlowProps {
  color?: GlowColor;
}

const colorMap: Record<GlowColor, string> = {
  primary: 'bg-primary',
  emerald: 'bg-emerald-500',
  indigo: 'bg-indigo-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
};

export default function BackgroundGlow({ color = 'primary' }: BackgroundGlowProps) {
  return (
    <div 
      className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] ${colorMap[color]} opacity-[0.08] blur-[120px] rounded-full pointer-events-none z-[-1] transition-colors duration-500`}
    ></div>
  );
}
