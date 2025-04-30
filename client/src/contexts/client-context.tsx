import { createContext, useContext, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

// Define survivor/client type
export interface SurvivorData {
  id: number;
  name: string;
  username?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType: string;
  role: string;
  organizationId?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ClientContextType {
  currentClient: SurvivorData | null;
  viewingAsClient: boolean;
  setCurrentClient: (client: SurvivorData | null) => void;
  clearCurrentClient: () => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [currentClient, setCurrentClient] = useState<SurvivorData | null>(null);
  
  return (
    <ClientContext.Provider
      value={{
        currentClient,
        viewingAsClient: !!currentClient,
        setCurrentClient,
        clearCurrentClient: () => setCurrentClient(null),
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
}

export function useClients() {
  // Add debugging to help identify any issues
  console.log("Old useClients hook called");
  
  const { data: survivors = [] } = useQuery<SurvivorData[]>({
    queryKey: ["/api/survivors"],
    retry: 3,
    refetchOnWindowFocus: true
  });
  
  // Additional debugging for the returned array
  console.log("Survivors array length:", survivors?.length);
  
  return survivors;
}

export function useClientId() {
  const { currentClient } = useClient();
  return currentClient?.id;
}