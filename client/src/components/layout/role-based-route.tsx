import { ReactNode } from "react";
import { Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { RoleBasedLayout } from "./role-based-layout";
import LoadingWrapper from "@/components/loading-wrapper";

interface RoleBasedRouteProps {
  path: string;
  component: React.ComponentType<any>;
  // Define which roles can access this route
  allowedRoles?: string[];
  // Whether to wrap the component in the RoleBasedLayout
  withLayout?: boolean;
  // Whether to use loading wrapper
  useLoading?: boolean;
}

export function RoleBasedRoute({
  path,
  component: Component,
  allowedRoles = ["super_admin", "admin", "case_manager", "user"],
  withLayout = true,
  useLoading = true,
}: RoleBasedRouteProps) {
  const { user, isLoading } = useAuth();

  // Render the route content based on authentication state and permissions
  const renderRouteContent = () => {
    // If auth is still loading, show loading spinner
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    // If not authenticated, redirect to auth page
    if (!user) {
      return <Redirect to="/auth" />;
    }

    // Make sure user.role is not null (fix TypeScript error)
    const userRole = user.role || "user";

    // If user doesn't have permission for this route, redirect based on their role
    if (!allowedRoles.includes(userRole)) {
      if (userRole === "super_admin") {
        return <Redirect to="/admin" />;
      } else if (userRole === "admin") {
        return <Redirect to="/org-admin" />;
      } else if (userRole === "case_manager") {
        return <Redirect to="/" />;
      } else {
        // Default for "user" and any other roles
        return <Redirect to="/" />;
      }
    }

    // Render the component with or without layout wrapper
    if (withLayout) {
      return (
        <RoleBasedLayout>
          {useLoading ? (
            <LoadingWrapper delay={50}>
              <Component />
            </LoadingWrapper>
          ) : (
            <Component />
          )}
        </RoleBasedLayout>
      );
    } else {
      return useLoading ? (
        <LoadingWrapper delay={50}>
          <Component />
        </LoadingWrapper>
      ) : (
        <Component />
      );
    }
  };

  return <Route path={path}>{renderRouteContent()}</Route>;
}