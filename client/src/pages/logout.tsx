import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function LogoutPage() {
  const { logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logoutMutation.mutateAsync();
        navigate("/auth");
      } catch (error) {
        console.error("Logout failed:", error);
        // Attempt to navigate to auth page even if logout failed
        setTimeout(() => navigate("/auth"), 1000);
      }
    };

    performLogout();
  }, [logoutMutation, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-lg">Logging you out...</p>
    </div>
  );
}