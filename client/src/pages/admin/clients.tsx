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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Eye, Edit, Trash2, Plus, Building2, Phone, MapPin,
  FileText, Lock, Building, Mail, BookOpen, HeartPulse, 
  AlertTriangle, Briefcase as BriefcaseIcon
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
    // Basic Personal Information
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    address: z.string().optional(),
    
    // Account Information
    username: z.string().min(3, "Username must be at least 3 characters").optional(),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
    organizationId: z.number().optional(),

    // Extended Personal Information
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    pronouns: z.string().optional(),
    ssn: z.string().optional(),
    maritalStatus: z.string().optional(),
    primaryLanguage: z.string().optional(),
    race: z.string().optional(),
    ethnicity: z.string().optional(),
    citizenshipStatus: z.string().optional(),
    veteranStatus: z.boolean().optional(),
    disabilityStatus: z.boolean().optional(),
    
    // Contact Information
    alternateContactName: z.string().optional(),
    alternateContactRelationship: z.string().optional(),
    alternateContactPhone: z.string().optional(),
    preferredContactMethod: z.string().optional(),
    
    // Residency Information
    currentAddress: z.string().optional(),
    moveInDate: z.string().optional(),
    residenceType: z.string().optional(),
    previousAddress: z.string().optional(),
    lengthOfResidency: z.string().optional(),
    housingStatus: z.string().optional(),
    femaCaseNumber: z.string().optional(),
    
    // Education & Employment
    educationLevel: z.string().optional(),
    currentlyEnrolled: z.boolean().optional(),
    schoolName: z.string().optional(),
    employmentStatus: z.string().optional(),
    employerName: z.string().optional(),
    jobTitle: z.string().optional(),
    monthlyIncome: z.string().optional(),
    incomeSource: z.string().optional(),
    
    // Health & Wellness
    medicalConditions: z.string().optional(),
    medications: z.string().optional(),
    mentalHealthConditions: z.string().optional(),
    mobilityDevices: z.string().optional(),
    healthInsurance: z.string().optional(),
    primaryCareProvider: z.string().optional(),
    
    // Government Involvement
    publicAssistance: z.string().optional(),
    caseworkerName: z.string().optional(),
    caseworkerAgency: z.string().optional(),
    justiceSystemInvolvement: z.boolean().optional(),
    childWelfareInvolvement: z.boolean().optional(),
    immigrationProceedings: z.boolean().optional(),
    
    // Disaster Impact
    disasterInjuries: z.boolean().optional(),
    lostMedications: z.boolean().optional(),
    accessNeeds: z.string().optional(),
    transportAccess: z.boolean().optional(),
    lostDocuments: z.string().optional(),
    
    // Additional Information
    notes: z.string().optional(),
    metaTags: z.string().optional(),
    isPregnant: z.boolean().optional(),
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
  const [filteredClients, setFilteredClients] = useState<SurvivorData[]>([]);
  const [, navigate] = useLocation();
  
  // Function to perform search
  const performSearch = (term: string, clientData: SurvivorData[] | undefined) => {
    if (!clientData) {
      setFilteredClients([]);
      return;
    }
    
    if (!term) {
      setFilteredClients(clientData);
      return;
    }
    
    const lowerTerm = term.toLowerCase();
    
    // Filter clients based on search term
    const filtered = clientData.filter(client => {
      if (!client) return false;
      
      // Construct full name from various properties
      const nameFromFields = client.firstName && client.lastName 
        ? `${client.firstName} ${client.lastName}`
        : '';
      const fullName = client.name || nameFromFields || '';
      
      // Search across multiple fields
      return fullName.toLowerCase().includes(lowerTerm) ||
        (client.firstName && client.firstName.toLowerCase().includes(lowerTerm)) ||
        (client.lastName && client.lastName.toLowerCase().includes(lowerTerm)) ||
        (client.email && client.email.toLowerCase().includes(lowerTerm)) ||
        (client.username && client.username.toLowerCase().includes(lowerTerm));
    });
    
    setFilteredClients(filtered);
    console.log(`Search for "${term}" found ${filtered.length} results`);
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
      
      // Also update our filtered data to include the new client at the top
      setFilteredClients(prev => {
        if (!prev) return [newClient];
        return [newClient, ...prev];
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

            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>

                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClientDetails(client);
                  }}
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

  // Directly filter the data for the table
  const getFilteredData = () => {
    if (!clients) return [];
    
    if (!searchTerm) return clients;
    
    // Filter the data based on search term
    return clients.filter(client => {
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
  };
  
  // Update filtered clients whenever the original clients data or search term changes
  useEffect(() => {
    performSearch(searchTerm, clients);
  }, [clients, searchTerm]);
  
  // Create the table instance
  const table = useReactTable({
    data: filteredClients,
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

  // Handle viewing as a specific client
  const handleViewAsClient = (client: SurvivorData) => {
    // Store selected client in localStorage or context
    sessionStorage.setItem('selectedClient', JSON.stringify(client));
    
    // Navigate to the action plan page with this client context
    navigate('/action-plan');
  };

  // Handle showing client details dialog
  const handleClientDetails = (client: SurvivorData) => {
    // Set the selected client for editing
    setSelectedClient(client);
    setOpen(true);
    
    // Load client data into form
    form.reset({
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      email: client.email || '',
      phone: client.phone || '',
      dateOfBirth: client.dateOfBirth || '',
      gender: client.gender || '',
      pronouns: client.pronouns || '',
      userType: client.type || 'survivor',
      role: 'user',
      // Additional personal information
      ssn: client.ssn || '',
      maritalStatus: client.maritalStatus || '',
      primaryLanguage: client.primaryLanguage || '',
      race: client.race || '',
      ethnicity: client.ethnicity || '',
      citizenshipStatus: client.citizenshipStatus || '',
      veteranStatus: client.veteranStatus || false,
      disabilityStatus: client.disabilityStatus || false,
      // Add more fields as needed
    });
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
            <div className="relative">
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => {
                  const term = e.target.value; 
                  setSearchTerm(term);
                  // The useEffect will handle updating the filtered results
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
                    // The useEffect will handle clearing the filter
                  }}
                >
                  <XCircle className="h-4 w-4" />
                  <span className="sr-only">Clear</span>
                </Button>
              )}
            </div>
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
                  onClick={() => handleClientDetails(row.original)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client account with detailed information using the tabs below.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Tabbed Navigation */}
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid grid-cols-4 md:grid-cols-8 mb-4">
                  <TabsTrigger value="personal" className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline">Personal</span>
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span className="hidden md:inline">Contact</span>
                  </TabsTrigger>
                  <TabsTrigger value="residency" className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span className="hidden md:inline">Residency</span>
                  </TabsTrigger>
                  <TabsTrigger value="employment" className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden md:inline">Employment</span>
                  </TabsTrigger>
                  <TabsTrigger value="health" className="flex items-center gap-1">
                    <HeartPulse className="h-4 w-4" />
                    <span className="hidden md:inline">Health</span>
                  </TabsTrigger>
                  <TabsTrigger value="government" className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden md:inline">Government</span>
                  </TabsTrigger>
                  <TabsTrigger value="disaster" className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="hidden md:inline">Disaster</span>
                  </TabsTrigger>
                  <TabsTrigger value="account" className="flex items-center gap-1">
                    <Lock className="h-4 w-4" />
                    <span className="hidden md:inline">Account</span>
                  </TabsTrigger>
                </TabsList>

                {/* Personal Information Tab */}
                <TabsContent value="personal" className="mt-0">
                  <h3 className="font-semibold text-lg text-primary mb-4">Personal Identification</h3>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="non-binary">Non-binary</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pronouns"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Pronouns</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., he/him, she/her, they/them" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ssn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SSN/ITIN (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="XXX-XX-XXXX" />
                          </FormControl>
                          <FormDescription>
                            This information is securely stored and masked.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maritalStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marital Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="married">Married</SelectItem>
                              <SelectItem value="divorced">Divorced</SelectItem>
                              <SelectItem value="widowed">Widowed</SelectItem>
                              <SelectItem value="separated">Separated</SelectItem>
                              <SelectItem value="domestic-partnership">Domestic Partnership</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="primaryLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Language</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., English, Spanish" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="race"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Race</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Race" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ethnicity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ethnicity</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ethnicity" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="citizenshipStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Citizenship/Immigration Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="us-citizen">US Citizen</SelectItem>
                              <SelectItem value="permanent-resident">Permanent Resident</SelectItem>
                              <SelectItem value="visa-holder">Visa Holder</SelectItem>
                              <SelectItem value="refugee">Refugee</SelectItem>
                              <SelectItem value="asylum-seeker">Asylum Seeker</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="veteranStatus"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Veteran Status</FormLabel>
                            <FormDescription>
                              Check if the person is a veteran.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="disabilityStatus"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Disability Status</FormLabel>
                            <FormDescription>
                              Check if the person has a disability.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Contact Information Tab */}
                <TabsContent value="contact" className="mt-0">
                  <h3 className="font-semibold text-lg text-primary mb-4">Contact Information</h3>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
                    <FormField
                      control={form.control}
                      name="preferredContactMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Contact Method</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="text">Text Message</SelectItem>
                              <SelectItem value="mail">Mail</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Current Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter client's address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="alternateContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alternate Contact Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Alternate contact name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="alternateContactRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alternate Contact Relationship</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Relative, Friend" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="alternateContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alternate Contact Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Alternate contact phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Residency Information Tab */}
                <TabsContent value="residency" className="mt-0">
                  <h3 className="font-semibold text-lg text-primary mb-4">Residency Information</h3>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="currentAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Current address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="moveInDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Move-in</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="residenceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type of Residence</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="owner">Owner</SelectItem>
                              <SelectItem value="renter">Renter</SelectItem>
                              <SelectItem value="transitional">Transitional</SelectItem>
                              <SelectItem value="unhoused">Unhoused</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="previousAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Previous Address (pre-disaster)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Previous address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lengthOfResidency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Length of Residency</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 3 years, 6 months" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="housingStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Housing Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="permanent">Permanent</SelectItem>
                              <SelectItem value="temporary">Temporary</SelectItem>
                              <SelectItem value="shelter">Shelter</SelectItem>
                              <SelectItem value="hotel">Hotel</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="femaCaseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>FEMA Case Number (if applicable)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="FEMA case number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Education & Employment Tab */}
                <TabsContent value="employment" className="mt-0">
                  <h3 className="font-semibold text-lg text-primary mb-4">Education & Employment</h3>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="educationLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Highest Education Level</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="less-than-high-school">Less than High School</SelectItem>
                              <SelectItem value="high-school">High School/GED</SelectItem>
                              <SelectItem value="some-college">Some College</SelectItem>
                              <SelectItem value="associates">Associate's Degree</SelectItem>
                              <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                              <SelectItem value="masters">Master's Degree</SelectItem>
                              <SelectItem value="doctorate">Doctorate</SelectItem>
                              <SelectItem value="trade-school">Trade School</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currentlyEnrolled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Currently Enrolled in School</FormLabel>
                            <FormDescription>
                              Check if currently attending.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="schoolName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School Name and Location</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="School name and location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="employmentStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employment Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="full-time">Full-time</SelectItem>
                              <SelectItem value="part-time">Part-time</SelectItem>
                              <SelectItem value="unemployed">Unemployed</SelectItem>
                              <SelectItem value="self-employed">Self-employed</SelectItem>
                              <SelectItem value="retired">Retired</SelectItem>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="employerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employer Name & Location</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Employer name and location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title or Role</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Job title or role" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="monthlyIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Household Income</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., $3000" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="incomeSource"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Income Source</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Wages, Benefits, Disability" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Health & Wellness Tab */}
                <TabsContent value="health" className="mt-0">
                  <h3 className="font-semibold text-lg text-primary mb-4">Health & Wellness</h3>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="medicalConditions"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Medical Conditions / Chronic Illnesses</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Medical conditions" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="medications"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Medications (critical only)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Critical medications" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mentalHealthConditions"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Mental Health Conditions</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Mental health conditions" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mobilityDevices"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobility/Assistive Devices Used</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Wheelchair, Walker" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="healthInsurance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Health Insurance Provider</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Health insurance provider" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="primaryCareProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Care Provider Info</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Primary care provider info" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isPregnant"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Is Pregnant</FormLabel>
                            <FormDescription>
                              Check if the person is currently pregnant.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Government Involvement Tab */}
                <TabsContent value="government" className="mt-0">
                  <h3 className="font-semibold text-lg text-primary mb-4">Government or Institutional Involvement</h3>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="publicAssistance"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Participation in Public Assistance Programs</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., TANF, SNAP, Medicaid" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="caseworkerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Caseworker Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Caseworker name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="caseworkerAgency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Caseworker Agency</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Caseworker agency" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="justiceSystemInvolvement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Justice System Involvement</FormLabel>
                            <FormDescription>
                              Check if there is past or present involvement.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="childWelfareInvolvement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Child Welfare System Involvement</FormLabel>
                            <FormDescription>
                              Check if there is involvement with child welfare system.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="immigrationProceedings"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Immigration Proceedings/Asylum</FormLabel>
                            <FormDescription>
                              Check if there are ongoing immigration proceedings or asylum application.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Disaster Impact Tab */}
                <TabsContent value="disaster" className="mt-0">
                  <h3 className="font-semibold text-lg text-primary mb-4">Disaster-Specific Impacts</h3>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="disasterInjuries"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Injuries during disaster?</FormLabel>
                            <FormDescription>
                              Check if the person sustained injuries during the disaster.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lostMedications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Lost medication/devices?</FormLabel>
                            <FormDescription>
                              Check if the person lost medications or medical devices.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accessNeeds"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Access needs post-disaster?</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Describe any access needs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="transportAccess"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Transport access post-disaster?</FormLabel>
                            <FormDescription>
                              Check if the person has access to transportation.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lostDocuments"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Lost documents?</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., ID, SS card, title, etc." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional notes about disaster impact" 
                              className="resize-none" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="metaTags"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Meta Tags</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., single_parent, evacuated_by_boat, tribal_member" />
                          </FormControl>
                          <FormDescription>
                            Add comma-separated tags for grant eligibility.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Account Tab */}
                <TabsContent value="account" className="mt-0">
                  <div className="grid gap-6">
                    <div>
                      <h3 className="font-semibold text-lg text-primary mb-4">Account Information</h3>
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
                              <FormDescription>
                                Leave blank to auto-generate a secure password.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg text-primary mb-4">Organization Assignment</h3>
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
                        <p className="text-sm text-muted-foreground mt-2">
                          The client will be associated with this organization upon creation. You can change this later if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

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