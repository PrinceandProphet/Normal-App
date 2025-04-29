import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'white';
  withText?: boolean;
  className?: string;
}

export function Logo({ 
  size = 'md', 
  variant = 'default', 
  withText = true,
  className 
}: LogoProps) {
  // Calculate dimensions based on size prop
  const dimensions = {
    sm: { width: 32, height: 32, fontSize: 'text-xl' },
    md: { width: 40, height: 40, fontSize: 'text-2xl' },
    lg: { width: 64, height: 64, fontSize: 'text-3xl' },
  }[size];
  
  // Calculate color based on variant
  const logoColor = variant === 'white' ? 'white' : 'black';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center justify-center">
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M83.6 107.1C118.3 107.1 146.2 135 146.2 169.7V430.3C146.2 465 118.3 492.9 83.6 492.9V107.1ZM513.4 107.1C478.7 107.1 450.8 135 450.8 169.7V430.3C450.8 465 478.7 492.9 513.4 492.9V107.1ZM143.9 158.1L456.1 470.3L424.5 501.9L112.3 189.7L143.9 158.1ZM563.5 351.3C541.3 351.3 523.1 369.5 523.1 391.7C523.1 413.9 541.3 432.1 563.5 432.1C585.7 432.1 603.9 413.9 603.9 391.7C603.9 369.5 585.7 351.3 563.5 351.3Z"
            fill={logoColor}
          />
        </svg>
      </div>
      
      {withText && (
        <span className={cn("font-bold tracking-tight", dimensions.fontSize)}>
          Nü
        </span>
      )}
    </div>
  );
}