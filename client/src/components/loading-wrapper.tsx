import { useState, useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingWrapperProps {
  children: ReactNode;
  delay?: number; // Delay before showing content in ms
  fullHeight?: boolean;
  isForm?: boolean; // Set to true for forms to prevent blocking inputs
  noAnimation?: boolean; // Set to true to disable fade animation (useful for forms)
}

/**
 * A wrapper component that shows a loading indicator initially, then fades in content.
 * This helps prevent UI flickering when navigating between pages.
 */
function LoadingWrapper({ 
  children, 
  delay = 100, 
  fullHeight = false,
  isForm = false,
  noAnimation = false
}: LoadingWrapperProps) {
  const [isLoading, setIsLoading] = useState(!isForm); // Don't show loading state for forms
  
  // Create a delayed render to prevent flickering during navigation
  useEffect(() => {
    // Skip loading state for forms entirely
    if (isForm) {
      setIsLoading(false);
      return;
    }
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [delay, isForm]);
  
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${fullHeight ? 'min-h-screen' : 'min-h-[400px]'}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Conditionally apply animation
  const animationClass = noAnimation ? '' : 'animate-in fade-in duration-300';
  
  return (
    <div className={animationClass}>
      {children}
    </div>
  );
}

export default LoadingWrapper;
export { LoadingWrapper };