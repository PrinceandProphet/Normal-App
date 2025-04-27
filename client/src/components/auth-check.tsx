import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface AuthCheckProps {
  children: ReactNode;
  isForm?: boolean; // Set to true when checking auth for form components
  noLoading?: boolean; // Set to true to skip loading state completely
}

/**
 * A component that checks if the user is authenticated and redirects to the login page if not.
 * This component should wrap protected routes.
 */
function AuthCheck({ children, isForm = false, noLoading = false }: AuthCheckProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showLoading, setShowLoading] = useState(!isForm && !noLoading);
  
  // Brief delay to avoid flash of loading indicator
  useEffect(() => {
    // Skip loading state for forms or when explicitly disabled
    if (isForm || noLoading) {
      setShowLoading(false);
      return;
    }
    
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 300); // Reduced from 500ms for faster response
    
    return () => clearTimeout(timer);
  }, [isForm, noLoading]);
  
  useEffect(() => {
    // If not loading anymore and no user, redirect to auth page
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [isLoading, user, setLocation]);
  
  // Show loading indicator if loading auth and not a form
  if ((isLoading || (showLoading && !user)) && !isForm && !noLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If user is authenticated, render children
  if (user) {
    return <>{children}</>;
  }
  
  // Otherwise render nothing while redirecting
  return null;
}

export default AuthCheck;