import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SurvivorData, useClientContext } from "@/hooks/use-client-context"
import { Check, ChevronDown, Search, UserCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useLocation } from "wouter"
import { cn } from "@/lib/utils"

export function ClientSelector() {
  const { selectedClient, setSelectedClient, clients, isLoading } = useClientContext()
  const [location, setLocation] = useLocation()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  // Reset client selection when navigating to pages that don't need client context
  useEffect(() => {
    const nonClientPages = ['/admin', '/org-admin', '/profile']
    if (nonClientPages.includes(location)) {
      setSelectedClient(null)
    }
  }, [location, setSelectedClient])

  const handleSelectClient = (client: SurvivorData) => {
    setSelectedClient(client)
    setOpen(false)
    
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

  // Get client's full name or fallback to name or 'Client'
  const getClientFullName = (client: SurvivorData) => {
    if (client.firstName && client.lastName) {
      return `${client.firstName} ${client.lastName}`;
    } else if (client.name) {
      return client.name;
    } else {
      return 'Client';
    }
  };

  // Debug the clients data
  console.log("Client Selector - clients data:", clients);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          role="combobox" 
          aria-expanded={open}
          size="sm" 
          className="w-[220px] justify-between"
        >
          {selectedClient ? (
            <span className="flex items-center truncate">
              <UserCircle className="mr-2 h-4 w-4" />
              {getClientFullName(selectedClient)}
            </span>
          ) : (
            <span className="flex items-center">
              <Search className="mr-2 h-4 w-4" />
              Search clients ({clients.length})...
            </span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search clients..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No clients found.</CommandEmpty>
            <CommandGroup heading={`All Clients (${clients.length})`}>
              {clients && clients.length > 0 ? 
                clients
                  .filter(client => {
                    if (!searchValue) return true;
                    const fullName = getClientFullName(client).toLowerCase();
                    return fullName.includes(searchValue.toLowerCase());
                  })
                  .map(client => (
                    <CommandItem
                      key={client.id}
                      value={client.id.toString()}
                      onSelect={() => handleSelectClient(client)}
                      className="flex items-center"
                    >
                      <UserCircle className="mr-2 h-4 w-4" />
                      <span className="truncate">{getClientFullName(client)}</span>
                      {client.status && (
                        <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-muted">
                          {client.status}
                        </span>
                      )}
                      {selectedClient?.id === client.id && (
                        <Check className="ml-auto h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))
                : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No clients available
                  </div>
                )
              }
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}