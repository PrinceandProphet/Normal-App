import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SurvivorData, useClientContext } from "@/hooks/use-client-context"
import { ChevronDown, UserCircle } from "lucide-react"
import { useEffect } from "react"
import { useLocation } from "wouter"

export function ClientSelector() {
  const { selectedClient, setSelectedClient, clients, isLoading } = useClientContext()
  const [location, setLocation] = useLocation()

  // Reset client selection when navigating to pages that don't need client context
  useEffect(() => {
    const nonClientPages = ['/admin', '/org-admin', '/profile']
    if (nonClientPages.includes(location)) {
      setSelectedClient(null)
    }
  }, [location, setSelectedClient])

  const handleSelectClient = (client: SurvivorData) => {
    setSelectedClient(client)
    
    // If already on a client-specific page, keep the same page type but for new client
    const clientSpecificPages = ['/action-plan', '/household', '/documents', '/messages', '/contacts']
    const currentPageType = clientSpecificPages.find(page => location.startsWith(page))
    
    if (currentPageType) {
      setLocation(currentPageType)
    } else if (location === '/') {
      // If on homepage, redirect to action plan as a default client view
      setLocation('/action-plan')
    }
  }

  // Don't show selector on non-client pages
  const nonClientPages = ['/admin', '/org-admin', '/profile']
  if (nonClientPages.some(page => location.startsWith(page))) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md animate-pulse bg-muted">
        <UserCircle className="h-4 w-4" />
        <span>Loading clients...</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 min-w-[180px] justify-between">
          {selectedClient ? (
            <>
              <span className="truncate">
                {selectedClient.firstName || ''} {selectedClient.lastName || selectedClient.name || 'Client'}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </>
          ) : (
            <>
              <span>Select a client</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px] max-h-[400px] overflow-y-auto">
        {clients && clients.length > 0 ? (
          clients.map((client) => (
            <DropdownMenuItem 
              key={client.id}
              onClick={() => handleSelectClient(client)}
              className={`cursor-pointer ${selectedClient?.id === client.id ? 'bg-primary/10 text-primary' : ''}`}
            >
              <UserCircle className="h-4 w-4 mr-2" />
              <span className="truncate">
                {client.firstName || ''} {client.lastName || client.name || 'Client'}
              </span>
              {client.status && (
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-muted">
                  {client.status}
                </span>
              )}
            </DropdownMenuItem>
          ))
        ) : (
          <div className="p-2 text-sm text-muted-foreground text-center">
            No clients available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}