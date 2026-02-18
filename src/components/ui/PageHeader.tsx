import React from 'react';

interface PageHeaderProps {
    title: React.ReactNode;
    description?: string;
    className?: string;
}

export default function PageHeader({ title, description, className = "" }: PageHeaderProps) {
  return (
    <div className={`text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 ${className}`}>
      <h1 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 md:mb-8 leading-none relative inline-block max-w-full break-words">
        {title}
      </h1>
      {description && (
        <p className="text-sm sm:text-xl md:text-2xl text-muted font-medium max-w-3xl mx-auto border-l-4 border-primary pl-4 py-2 text-left md:text-center md:border-l-0 md:border-t-4 md:pt-6">
          {description}
        </p>
      )}
    </div>
  );
}
