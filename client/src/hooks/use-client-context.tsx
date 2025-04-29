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

  // Clear selected client when logging out or auto-select client for user role
  useEffect(() => {
    if (!user) {
      setSelectedClient(null);
    } else if (user.role === "user") {
      // For survivors/clients, automatically select themselves
      // This ensures they always see their own data
      if (clients.length > 0) {
        const ownClientData = clients.find(client => client.id === user.id);
        if (ownClientData) {
          setSelectedClient(ownClientData);
        }
      }
    }
  }, [user, clients]);

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