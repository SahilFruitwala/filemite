import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: string;
  className?: string;
}

export default function PageHeader({ title, description, className = '' }: PageHeaderProps) {
  return (
    <div className={`text-center mb-16 ${className}`}>
      <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight text-white animate-in fade-in slide-in-from-bottom-4 duration-700">
        {title}
      </h1>
      {description && (
        <p className="text-xl text-gray-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
          {description}
        </p>
      )}
    </div>
  );
}
