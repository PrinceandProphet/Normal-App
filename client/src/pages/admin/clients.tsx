import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { 
  User, UserCircle, MoreHorizontal, ChevronDown, Search, 
  ArrowUpDown, CheckCircle, XCircle, Clock, RefreshCw, 
  Eye, Edit, Trash2
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

// Type definitions for the client data
interface SurvivorData {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  username?: string;
  role?: string;
  organizationId?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  firstName?: string;
  lastName?: string;
  organizations?: { id: number; name: string; status: string }[];
}

export default function AllClientsPage() {
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SurvivorData | null>(null);
  const [, navigate] = useLocation();

  // Fetch all clients/survivors
  const {
    data: clients,
    isLoading,
    isError,
  } = useQuery<SurvivorData[]>({
    queryKey: ["/api/survivors"],
  });

  // Fetch organizations for the select dropdown
  const { data: organizations } = useQuery<any[]>({
    queryKey: ["/api/organizations"],
  });

  // Define table columns
  const columns: ColumnDef<SurvivorData>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const client = row.original;
        const fullName = client.firstName && client.lastName
          ? `${client.firstName} ${client.lastName}`
          : client.name;
        
        return (
          <div className="flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-muted-foreground" />
            <div>
              <div className="font-medium">{fullName}</div>
              {client.username && (
                <div className="text-xs text-muted-foreground">{client.username}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Contact",
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="space-y-1">
            {client.email && (
              <div className="text-sm">{client.email}</div>
            )}
            {client.phone && (
              <div className="text-sm text-muted-foreground">{client.phone}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => {
        const address = row.original.address;
        if (!address) return <span className="text-muted-foreground text-sm">No address</span>;
        
        // Truncate long addresses
        const truncated = address.length > 30 
          ? `${address.substring(0, 30)}...` 
          : address;
        
        return <span title={address}>{truncated}</span>;
      },
    },
    {
      accessorKey: "organizations",
      header: "Organizations",
      cell: ({ row }) => {
        const orgs = row.original.organizations;
        
        if (!orgs || orgs.length === 0) {
          return <span className="text-muted-foreground text-sm">None</span>;
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {orgs.slice(0, 2).map((org) => (
              <Badge key={org.id} variant="outline" className="text-xs">
                {org.name}
              </Badge>
            ))}
            {orgs.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{orgs.length - 2} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string | undefined;
        
        if (!status) return <span className="text-muted-foreground text-sm">-</span>;
        
        return (
          <Badge 
            variant={
              status === "active" ? "default" : 
              status === "inactive" ? "secondary" : 
              status === "pending" ? "outline" : 
              "destructive"
            }
            className="text-xs"
          >
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const client = row.original;
        
        return (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleViewAsClient(client);
              }}
              title="View as this client"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => handleViewAsClient(client)}
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View as
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleClientDetails(client)}
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDeleteClient(client)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Create the table instance
  const table = useReactTable({
    data: clients || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  // Apply global filter for search
  useEffect(() => {
    if (searchTerm) {
      // Filter the data based on search term
      const filteredData = clients?.filter(client => {
        const fullName = client.firstName && client.lastName
          ? `${client.firstName} ${client.lastName}`
          : client.name;
          
        return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (client.username && client.username.toLowerCase().includes(searchTerm.toLowerCase()));
      });
      
      // Update the table data with filtered results
      table.setOptions(prev => ({
        ...prev,
        data: filteredData || [],
      }));
    } else {
      // Reset to original data when search is cleared
      table.setOptions(prev => ({
        ...prev,
        data: clients || [],
      }));
    }
  }, [searchTerm, clients, table]);

  // Handle viewing as a specific client
  const handleViewAsClient = (client: SurvivorData) => {
    // Store selected client in localStorage or context
    sessionStorage.setItem('selectedClient', JSON.stringify(client));
    
    // Navigate to the action plan page with this client context
    navigate('/action-plan');
  };

  // Handle showing client details dialog
  const handleClientDetails = (client: SurvivorData) => {
    setSelectedClient(client);
    setOpen(true);
  };

  // Handle client deletion (this would need backend implementation)
  const handleDeleteClient = (client: SurvivorData) => {
    if (confirm(`Are you sure you want to delete ${client.name}?`)) {
      // Implement deletion logic here
      toast({
        title: "Not implemented",
        description: "Client deletion is not implemented in this version.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Clients</h1>
          <p className="text-muted-foreground">
            View and manage all clients in the system
          </p>
        </div>
      </div>

      {/* Search and filter section */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setSearchTerm("")}
              >
                <XCircle className="h-4 w-4" />
                <span className="sr-only">Clear</span>
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Optional: Add filter buttons here */}
        </div>
      </div>

      {/* Clients table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              // Error state
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="h-6 w-6 text-muted-foreground" />
                    <p>Failed to load clients</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/survivors'] })}
                    >
                      Try again
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              // Data rows
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id}
                  onClick={() => handleViewAsClient(row.original)}
                  className="cursor-pointer hover:bg-accent"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : searchTerm ? (
              // No results for search
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No clients found matching "{searchTerm}"
                </TableCell>
              </TableRow>
            ) : (
              // No data
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No clients found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2">
        <div className="text-sm text-muted-foreground">
          Page{" "}
          <span className="font-medium">
            {table.getState().pagination.pageIndex + 1}
          </span>{" "}
          of{" "}
          <span className="font-medium">{table.getPageCount()}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      {/* Client Details Dialog - Can be implemented later */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
            <DialogDescription>
              View and edit client information
            </DialogDescription>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <User className="h-16 w-16 mx-auto text-primary/20" />
                <h3 className="mt-2 text-lg font-medium">
                  {selectedClient.firstName && selectedClient.lastName
                    ? `${selectedClient.firstName} ${selectedClient.lastName}`
                    : selectedClient.name}
                </h3>
                {selectedClient.username && (
                  <p className="text-sm text-muted-foreground">@{selectedClient.username}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm">{selectedClient.email || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm">{selectedClient.phone || "Not provided"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm">{selectedClient.address || "Not provided"}</p>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => handleViewAsClient(selectedClient)}>
                  View as Client
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}