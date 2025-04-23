import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteComponentProps } from "wouter";
import { Suspense, ReactNode } from "react";

interface ProtectedRouteProps {
  path: string;
  component?: React.ComponentType<any>;
  children?: ReactNode;
}

export function ProtectedRoute({ path, component: Component, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Don't need to show loading indicator here since it's already handled at the App level
  // This prevents double loading indicators and flickering
  
  return (
    <Route path={path}>
      {(params) => {
        // If still loading, render nothing to prevent flicker
        if (isLoading) {
          return null;
        }
        
        // If no user is authenticated, redirect to auth page
        if (!user) {
          return <Redirect to="/auth" />;
        }
        
        // If children are provided (for lazy loaded components with custom Suspense), render them
        if (children) {
          return <>{children}</>;
        }
        
        // Otherwise, render the component with Suspense
        return Component ? <Component {...params} /> : null;
      }}
    </Route>
  );
}