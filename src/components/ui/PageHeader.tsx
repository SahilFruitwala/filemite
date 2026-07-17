import React from 'react';

interface PageHeaderProps {
    title: React.ReactNode;
    description?: string;
    className?: string;
}

export default function PageHeader({ title, description, className = "" }: PageHeaderProps) {
  return (
    <div className={`text-center mb-8 sm:mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 ${className}`}>
      <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 sm:mb-6 md:mb-8 text-foreground leading-[1.15] relative inline-block max-w-full break-words">
        {title}
      </h1>
      {description && (
        <p className="text-base sm:text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed px-1">
          {description}
        </p>
      )}
    </div>
  );
}
