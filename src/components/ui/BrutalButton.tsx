import React from "react";
import Link from "next/link";

interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
  fullWidth?: boolean;
}

export default function BrutalButton({
  children,
  className = "",
  variant = "primary",
  size = "md",
  href,
  fullWidth = false,
  ...props
}: BrutalButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-bold uppercase tracking-wider transition-all duration-200 border-2 border-border active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary text-white shadow-[4px_4px_0px_0px_var(--color-border)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--color-border)]",
    secondary: "bg-surface text-foreground shadow-[4px_4px_0px_0px_var(--color-border)] hover:bg-foreground hover:text-background hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--color-border)]",
    outline: "bg-transparent text-foreground border-2 border-border hover:bg-border hover:text-background",
    ghost: "border-transparent shadow-none hover:bg-surface hover:border-border",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-lg",
  };

  const widthClass = fullWidth ? "w-full" : "";
  const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`;

  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
}
