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

// Create context with default values
const defaultContext: ClientContextType = {
  selectedClient: null,
  setSelectedClient: () => {},
  clients: [],
  isLoading: false,
  error: null
};

export const ClientContext = createContext<ClientContextType>(defaultContext);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState<SurvivorData | null>(null);
  
  // Fetch survivors/clients for the organization
  const {
    data: clients = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: ['/api/survivors'],
    // Enable for any logged-in user, not just admins
    enabled: !!user,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // 30 seconds
  });

  // Clear selected client when logging out or auto-select client for user role
  useEffect(() => {
    if (!user) {
      setSelectedClient(null);
    } else if (user.role === "user" && Array.isArray(clients)) {
      // For survivors/clients, automatically select themselves
      // This ensures they always see their own data
      if (clients.length > 0) {
        const ownClientData = clients.find((client: any) => client.id === user.id);
        if (ownClientData) {
          setSelectedClient(ownClientData);
        }
      }
    }
  }, [user, clients]);

  // Process clients data to ensure it's properly formatted
  const typedClients = Array.isArray(clients) 
    ? clients.map((client: any) => ({
        ...client,
        // Ensure core properties exist
        id: client.id,
        name: client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unknown',
        role: client.role || 'user',
        userType: client.userType || 'survivor',
      })) as SurvivorData[] 
    : [];

  return (
    <ClientContext.Provider
      value={{
        selectedClient,
        setSelectedClient,
        clients: typedClients,
        isLoading,
        error,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  return useContext(ClientContext);
}