import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Define the types
export interface SurvivorData extends User {
  status?: string;
}

type ClientContextType = {
  selectedClient: SurvivorData | null;
  setSelectedClient: (client: SurvivorData | null) => void;
  clients: SurvivorData[];
  isLoading: boolean;
  error: Error | null;
};

export const ClientContext = createContext<ClientContextType | null>(null);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState<SurvivorData | null>(null);
  
  // Fetch survivors/clients for the organization
  const {
    data: clients = [],
    error,
    isLoading,
  } = useQuery<SurvivorData[], Error>({
    queryKey: ['/api/survivors'],
    // Enable for any logged-in user, not just admins
    enabled: !!user,
    onError: (error) => {
      toast({
        title: "Failed to load clients",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clear selected client when logging out
  useEffect(() => {
    if (!user) {
      setSelectedClient(null);
    }
  }, [user]);

  return (
    <ClientContext.Provider
      value={{
        selectedClient,
        setSelectedClient,
        clients,
        isLoading,
        error,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClientContext must be used within a ClientProvider");
  }
  return context;
}