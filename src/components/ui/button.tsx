import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Chunky "sticker" press: ink outline and hard shadow that the button sinks into when pressed.
const POP =
  'border-2 border-ink shadow-pop-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-pop active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:shadow-none';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: `${POP} bg-primary text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary),black_6%)] dark:hover:bg-[color-mix(in_oklch,var(--primary),white_8%)]`,
        ink: `${POP} bg-foreground text-background hover:bg-foreground/88`,
        outline: `${POP} bg-card text-foreground hover:bg-muted`,
        secondary: 'bg-secondary text-secondary-foreground hover:bg-muted',
        soft: 'bg-primary-soft text-primary hover:bg-[color-mix(in_oklch,var(--primary)_18%,var(--card))]',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        danger: 'text-danger hover:bg-danger-soft',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        xs: "h-7 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: 'h-8 rounded-md px-3 text-[13px]',
        default: 'h-9 px-3.5',
        lg: 'h-10 px-4',
        xl: 'h-12 rounded-xl px-5 text-[15px] font-semibold',
        icon: 'size-9',
        'icon-sm': 'size-8 rounded-md',
        'icon-lg': 'size-10',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, block, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
