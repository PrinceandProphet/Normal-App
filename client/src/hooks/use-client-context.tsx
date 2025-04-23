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

interface ClientContextType {
  selectedClient: SurvivorData | null;
  setSelectedClient: (client: SurvivorData | null) => void;
  clients: SurvivorData[];
  isLoading: boolean;
  error: Error | null;
}

// Use null as default context - this is fine with the null check in the hook
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
  });

  // Check if we need to find a client by ID in the loaded data
  useEffect(() => {
    if (cachedClient && !selectedClient && clients.length > 0) {
      const foundClient = clients.find(client => client.id === cachedClient.id);
      if (foundClient) {
        setSelectedClient(foundClient);
      }
    }
  }, [clients, cachedClient, selectedClient]);

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