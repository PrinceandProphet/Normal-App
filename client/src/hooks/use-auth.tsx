import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isRouteChanging, setIsRouteChanging] = useState(false);
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Set route changing flag to true to prevent flicker
      setIsRouteChanging(true);
      
      // Use wouter's setLocation for smooth client-side navigation
      setTimeout(() => {
        console.log('🧭 Routing user after login/registration:', { 
          id: user.id,
          username: user.username,
          role: user.role, 
          userType: user.userType 
        });

        // First check specific user types
        if (user.userType === 'survivor') {
          console.log('🏠 Routing survivor to home page');
          setLocation('/');
        } else if (user.role === 'super_admin') {
          console.log('🛡️ Routing super admin to admin page');
          setLocation('/admin');
        } else if (user.role === 'admin') {
          console.log('🏢 Routing admin to org dashboard');
          setLocation('/org-dashboard'); // Redirect to the new Organization Admin dashboard
        } else if (user.role === 'case_manager') {
          console.log('👥 Routing case manager to practitioner dashboard');
          setLocation('/practitioner-dashboard');
        } else {
          // Fallback to role-based routing
          console.log('⚠️ Using fallback routing to home page');
          setLocation('/'); // Default for users/survivors
        }
        
        // Reset route changing flag once navigation is complete
        setIsRouteChanging(false);
      }, 50);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      console.log('📝 Sending registration request for:', credentials.username);
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      console.log('✅ Registration successful, user data:', { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        userType: user.userType 
      });
      
      queryClient.setQueryData(["/api/user"], user);
      
      // Set route changing flag to true to prevent flicker
      setIsRouteChanging(true);
      
      // Use wouter's setLocation for smooth client-side navigation
      setTimeout(() => {
        console.log('🧭 Routing user after registration:', { 
          id: user.id,
          username: user.username,
          role: user.role, 
          userType: user.userType 
        });

        // First check specific user types
        if (user.userType === 'survivor') {
          console.log('🏠 Routing new survivor to home page');
          setLocation('/');
        } else if (user.role === 'super_admin') {
          console.log('🛡️ Routing super admin to admin page');
          setLocation('/admin');
        } else if (user.role === 'admin') {
          console.log('🏢 Routing admin to org dashboard');
          setLocation('/org-dashboard'); // Redirect to the new Organization Admin dashboard
        } else if (user.role === 'case_manager') {
          console.log('👥 Routing case manager to practitioner dashboard');
          setLocation('/practitioner-dashboard');
        } else {
          // Fallback to role-based routing
          console.log('⚠️ Using fallback routing to home page');
          setLocation('/'); // Default for users/survivors
        }
        
        // Reset route changing flag once navigation is complete
        setIsRouteChanging(false);
      }, 50);
      
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}