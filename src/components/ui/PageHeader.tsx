import React from 'react';

interface PageHeaderProps {
    title: React.ReactNode;
    description?: string;
    className?: string;
}

export default function PageHeader({ title, description, className = "" }: PageHeaderProps) {
  return (
    <div className={`text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 ${className}`}>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 md:mb-8 text-foreground leading-tight relative inline-block max-w-full break-words">
        {title}
      </h1>
      {description && (
        <p className="text-lg sm:text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
