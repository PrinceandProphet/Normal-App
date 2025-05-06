import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

/**
 * This component will force logout the user and redirect to the auth page
 * It's mounted on /forced-auth to provide a clean way to access the login screen
 */
export default function ForcedAuth() {
  const { logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    const logout = async () => {
      try {
        console.log("Forcing logout from ForcedAuth page");
        await logoutMutation.mutateAsync();
      } catch (error) {
        console.error("Error during forced logout:", error);
      } finally {
        // Regardless of success/failure, navigate to auth page
        setTimeout(() => {
          // Use replace: true to avoid having the forced-auth page in history
          navigate("/auth", { replace: true });
        }, 500);
      }
    };

    logout();
  }, [logoutMutation, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-lg">Preparing login page...</p>
    </div>
  );
}