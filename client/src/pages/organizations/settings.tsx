import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import OrganizationSettings from "../organization-settings";

// This is a wrapper component that redirects to organization settings
export default function OrganizationSettingsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  useEffect(() => {
    // If user isn't admin or super_admin, redirect to home
    if (user && user.role !== "admin" && user.role !== "super_admin") {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <OrganizationSettings />;
}