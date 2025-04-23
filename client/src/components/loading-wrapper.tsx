import { useState, useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingWrapperProps {
  children: ReactNode;
  delay?: number; // Delay before showing content in ms
  fullHeight?: boolean;
}

/**
 * A wrapper component that shows a loading indicator initially, then fades in content.
 * This helps prevent UI flickering when navigating between pages.
 */
export function LoadingWrapper({ 
  children, 
  delay = 100, 
  fullHeight = false 
}: LoadingWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Create a delayed render to prevent flickering during navigation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [delay]);
  
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${fullHeight ? 'min-h-screen' : 'min-h-[400px]'}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="animate-in fade-in duration-300">
      {children}
    </div>
  );
}