import { ReactNode } from "react";
import Sidebar from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { ClientSelector } from "@/components/client-selector";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface RoleBasedLayoutProps {
  children: ReactNode;
}

export function RoleBasedLayout({ children }: RoleBasedLayoutProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  // If still loading, show loading spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no user is logged in, this should not happen as ProtectedRoute should redirect
  if (!user) {
    return null;
  }

  // Function to render the page header based on user role and current page
  const renderHeader = () => {
    let title = "";
    let showClientSelector = false;
    let showRoleBadge = true;
    
    // Determine title and whether to show client selector based on path and role
    if (location === "/") {
      title = "Dashboard";
    } else if (location === "/admin") {
      title = "Admin Dashboard";
    } else if (location === "/org-admin") {
      title = "Organization Dashboard";
    } else if (location.startsWith("/admin/")) {
      title = location === "/admin/organizations" 
        ? "Organizations Management" 
        : location === "/admin/clients" 
          ? "All Clients" 
          : "Admin";
    } else if (location.includes("/settings")) {
      title = "Organization Settings";
    } else if (location === "/action-plan") {
      title = "Action Plan";
      showClientSelector = true;
    } else if (location === "/household") {
      title = "Household & Properties";
      showClientSelector = true;
    } else if (location === "/documents") {
      title = "Documents";
      showClientSelector = true;
    } else if (location === "/messages") {
      title = "Messages";
      showClientSelector = true;
    } else if (location === "/contacts") {
      title = "Contacts";
      showClientSelector = true;
    } else if (location === "/capital-sources") {
      title = "Capital Sources";
      showClientSelector = true;
    } else if (location === "/profile") {
      title = "Profile Settings";
      showRoleBadge = false;
    } else if (location === "/funding-opportunities") {
      title = "Funding Opportunities";
    } else if (location === "/opportunity-matches") {
      title = "Opportunity Matches";
    } else {
      title = "Disaster Planning";
    }

    // Only show client selector for admin roles (super_admin, admin, case_manager)
    // For survivors/clients, they are always in their own context and never need client selector
    const shouldShowClientSelector = showClientSelector && 
      (user.role === "super_admin" || user.role === "admin" || user.role === "case_manager") && 
      user.role !== "user";

    return (
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold text-foreground mr-3">
            {title}
          </h1>
          {showRoleBadge && renderRoleBadge()}
        </div>
        <div className="flex items-center">
          {shouldShowClientSelector && <ClientSelector />}
        </div>
      </div>
    );
  };

  // Function to render a badge indicating user's role
  const renderRoleBadge = () => {
    let badgeText = "";
    let variant: "default" | "destructive" | "outline" | "secondary" | null = "outline";
    
    switch (user.role) {
      case "super_admin":
        badgeText = "Super Admin";
        variant = "destructive";
        break;
      case "admin":
        badgeText = "Organization Admin";
        variant = "secondary";
        break;
      case "case_manager":
        badgeText = "Case Manager";
        variant = "outline";
        break;
      case "user":
        badgeText = "Client";
        variant = "default";
        break;
      default:
        badgeText = user.role || "User";
    }
    
    return (
      <Badge variant={variant} className="ml-2">
        {badgeText}
      </Badge>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {renderHeader()}
        {children}
      </main>
    </div>
  );
}