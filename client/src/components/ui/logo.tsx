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
    sm: { width: 24, height: 24, fontSize: 'text-xl' },
    md: { width: 32, height: 32, fontSize: 'text-2xl' },
    lg: { width: 48, height: 48, fontSize: 'text-3xl' },
  }[size];
  
  // Calculate color based on variant
  const colorClasses = variant === 'white' 
    ? "text-white bg-transparent" 
    : "text-black";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div 
        className={cn(
          "flex items-center justify-center rounded-sm overflow-hidden bg-[#FFDB73]",
          colorClasses
        )} 
        style={{ 
          width: dimensions.width, 
          height: dimensions.height 
        }}
      >
        <svg
          viewBox="0 0 512 512"
          width={dimensions.width * 0.7}
          height={dimensions.height * 0.7}
          fill="currentColor"
        >
          <path d="M162 128C139.9 128 122 145.9 122 168V344C122 366.1 139.9 384 162 384V128zM122 384V128H162V384H122zM350 128C372.1 128 390 145.9 390 168V344C390 366.1 372.1 384 350 384V128zM390 384V128H350V384H390zM243.1 154.1L358.9 357.9L327.1 373.9L212.9 169.1L243.1 154.1zM212.9 169.1L327.1 373.9L358.9 357.9L243.1 154.1L212.9 169.1zM459.2 267.2C448.7 267.2 439.5 274.6 436.1 284.6C432.7 294.6 436.7 305.9 445.7 312.2C453.3 317.5 464 317.5 471.5 312.2C480.6 305.9 484.6 294.6 481.2 284.6C477.7 274.6 468.6 267.2 458.1 267.2H459.2z" />
        </svg>
      </div>
      
      {withText && (
        <span className={cn("font-bold tracking-tight", dimensions.fontSize)}>
          NextSteps
        </span>
      )}
    </div>
  );
}