import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Eye, Edit, Trash2, Plus, Building2
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import * as z from "zod";
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

// Create a custom schema for client creation with validation
const clientFormSchema = insertUserSchema
  .extend({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    username: z.string().min(3, "Username must be at least 3 characters").optional(),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    organizationId: z.number().optional(),
  })
  .omit({ id: true });

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function AllClientsPage() {
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SurvivorData | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [, navigate] = useLocation();
  
  // Function to handle search refresh
  const refreshSearch = () => {
    // Force re-filtering by directly updating the table data
    if (!clients) return;
    
    if (searchTerm) {
      // Filter the data based on search term
      const filteredData = clients.filter(client => {
        if (!client) return false;
        
        // Construct a full name from name field and/or firstName+lastName fields
        const nameFromFields = client.firstName && client.lastName 
          ? `${client.firstName} ${client.lastName}`
          : '';
        const fullName = client.name || nameFromFields || '';
        
        // Search in all relevant fields
        return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (client.firstName && client.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (client.lastName && client.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (client.username && client.username.toLowerCase().includes(searchTerm.toLowerCase()));
      });
      
      // Directly update the table data with filtered results
      table.setOptions(prev => ({
        ...prev,
        data: filteredData,
      }));
      
      console.log('Forced search refresh:', filteredData.length, 'matches for', searchTerm);
    } else {
      // Reset to original data when search is cleared
      table.setOptions(prev => ({
        ...prev,
        data: clients,
      }));
    }
  };
  
  // Form setup for client creation
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      userType: "survivor",
      role: "user",
    },
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      // Combine firstName and lastName for the name field and ensure password is provided
      const fullData = {
        ...data,
        name: `${data.firstName} ${data.lastName}`,
        // Include firstName and lastName explicitly
        firstName: data.firstName,
        lastName: data.lastName,
        // Generate a random password if not provided
        password: data.password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8),
      };
      
      const response = await apiRequest('POST', '/api/register', fullData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create client");
      }
      return await response.json();
    },
    onSuccess: (newClient) => {
      // Clear form and close dialog
      form.reset();
      setShowClientForm(false);
      setSelectedOrgId(null);
      
      // Add the new client to the beginning of the existing list
      // This prevents the server from returning only the new client
      // and ensures new entries appear at the top of the table
      queryClient.setQueryData<SurvivorData[]>(['/api/survivors'], (oldData) => {
        // If there's no existing data, create a new array with just the new client
        if (!oldData) return [newClient];
        
        // Add the new client to the beginning of the array
        return [newClient, ...oldData];
      });
      
      // Show success message
      toast({
        title: "Client created",
        description: "The client was successfully created",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating client",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: ClientFormValues) => {
    // Add organization ID if selected
    if (selectedOrgId) {
      data.organizationId = selectedOrgId;
    }
    
    createClientMutation.mutate(data);
  };

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

  // Apply global filter for search - now triggered manually through refreshSearch()
  useEffect(() => {
    // Initial load of data
    if (clients && table) {
      table.setOptions(prev => ({
        ...prev,
        data: clients,
      }));
    }
  }, [clients, table]);

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
        <Button onClick={() => {
          setSelectedClient(null);
          setShowClientForm(true);
        }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Search and filter section */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <form onSubmit={(e) => {
              e.preventDefault();
              refreshSearch();
            }}>
              <div className="flex">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      // Refresh search on each keystroke
                      if (clients) {
                        const term = e.target.value;
                        if (term) {
                          const filteredData = clients.filter(client => {
                            if (!client) return false;
                            
                            const nameFromFields = client.firstName && client.lastName 
                              ? `${client.firstName} ${client.lastName}`
                              : '';
                            const fullName = client.name || nameFromFields || '';
                            
                            return fullName.toLowerCase().includes(term.toLowerCase()) ||
                              (client.firstName && client.firstName.toLowerCase().includes(term.toLowerCase())) ||
                              (client.lastName && client.lastName.toLowerCase().includes(term.toLowerCase())) ||
                              (client.email && client.email.toLowerCase().includes(term.toLowerCase())) ||
                              (client.username && client.username.toLowerCase().includes(term.toLowerCase()));
                          });
                          
                          table.setOptions(prev => ({
                            ...prev,
                            data: filteredData,
                          }));
                          
                          console.log('Live search:', filteredData.length, 'matches for', term);
                        } else {
                          table.setOptions(prev => ({
                            ...prev,
                            data: clients,
                          }));
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        refreshSearch();
                      }
                    }}
                    className="pl-8 w-full pr-8"
                  />
                  {searchTerm && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => {
                        setSearchTerm("");
                        if (clients) {
                          table.setOptions(prev => ({
                            ...prev,
                            data: clients,
                          }));
                        }
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="sr-only">Clear</span>
                    </Button>
                  )}
                </div>
                <Button 
                  type="submit" 
                  size="sm" 
                  className="ml-2"
                >
                  Search
                </Button>
              </div>
            </form>
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

      {/* Client Creation Dialog */}
      <Dialog open={showClientForm} onOpenChange={setShowClientForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client account. Clients can be added to organizations after creation.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="First Name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Last Name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Email" type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Phone Number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Username" />
                        </FormControl>
                        <FormDescription>
                          If provided, the client can log in to their account.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Password" type="password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Address</h3>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter client's address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Organization Assignment */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Organization</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="organizationId">Assign to Organization</Label>
                    <Select
                      onValueChange={(value) => setSelectedOrgId(Number(value))}
                      value={selectedOrgId?.toString() || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an organization (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations?.map((org) => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The client will be associated with this organization upon creation.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  form.reset();
                  setShowClientForm(false);
                }}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createClientMutation.isPending}
                >
                  {createClientMutation.isPending && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Client
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
            
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