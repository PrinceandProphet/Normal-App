import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface AuthCheckProps {
  children: ReactNode;
}

/**
 * A component that checks if the user is authenticated and redirects to the login page if not.
 * This component should wrap protected routes.
 */
export function AuthCheck({ children }: AuthCheckProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showLoading, setShowLoading] = useState(true);
  
  // Brief delay to avoid flash of loading indicator
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    // If not loading anymore and no user, redirect to auth page
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [isLoading, user, setLocation]);
  
  // Show loading indicator if loading auth
  if (isLoading || (showLoading && !user)) {
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