import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

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
  
  // Initialize with any client from query cache (set by admin pages)
  const cachedClient = queryClient.getQueryData<SurvivorData>(['selectedClient']);
  const [selectedClient, setSelectedClient] = useState<SurvivorData | null>(cachedClient || null);
  
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
    onSuccess: (data) => {
      // If we have a cached client ID but not the full data, find it in the newly loaded data
      if (cachedClient && !selectedClient && data.length > 0) {
        const foundClient = data.find(client => client.id === cachedClient.id);
        if (foundClient) {
          setSelectedClient(foundClient);
        }
      }
    }
  });

  // Update query cache when selected client changes
  useEffect(() => {
    if (selectedClient) {
      queryClient.setQueryData(['selectedClient'], selectedClient);
    } else {
      queryClient.removeQueries({ queryKey: ['selectedClient'] });
    }
  }, [selectedClient]);

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