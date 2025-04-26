import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Building2, Users, Phone, Mail, Globe, MapPin, Trash2, Edit, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Organization } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Organization form schema with address fields
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits" }),
  website: z.string().optional(),
  address1: z.string().min(1, { message: "Address is required" }),
  address2: z.string().optional(),
  city: z.string().min(1, { message: "City is required" }),
  state: z.string().min(1, { message: "State is required" }),
  zipCode: z.string().min(1, { message: "Zip code is required" }),
  country: z.string().min(1, { message: "Country is required" }),
  description: z.string().optional(),
  type: z.string(),
});

export default function OrganizationsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);

  // Fetch organizations
  const { data: organizations, isLoading, isError } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
  });

  // Form for adding/editing organizations
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      website: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      description: "",
      type: "nonprofit",
    },
  });

  // Reset form to defaults or populated with org data for editing
  const resetForm = (org?: Organization) => {
    if (org) {
      // Parse address from the organization's address field if it exists
      const addressParts = org.address ? parseAddress(org.address) : { 
        address1: "", 
        address2: "", 
        city: "", 
        state: "", 
        zipCode: "", 
        country: "United States" 
      };

      form.reset({
        name: org.name || "",
        email: org.email || "",
        phone: org.phone || "",
        website: org.website || "",
        address1: addressParts.address1,
        address2: addressParts.address2,
        city: addressParts.city,
        state: addressParts.state,
        zipCode: addressParts.zipCode,
        country: addressParts.country,
        description: org.description || "",
        type: org.type || "nonprofit",
      });
      setEditingOrganization(org);
    } else {
      form.reset({
        name: "",
        email: "",
        phone: "",
        website: "",
        address1: "",
        address2: "",
        city: "",
        state: "",
        zipCode: "",
        country: "United States",
        description: "",
        type: "nonprofit",
      });
      setEditingOrganization(null);
    }
  };

  // Parse address string into components (simple implementation)
  const parseAddress = (address: string) => {
    const parts = address.split(',').map(part => part.trim());
    return {
      address1: parts[0] || "",
      address2: parts.length > 4 ? parts[1] : "",
      city: parts.length > 4 ? parts[2] : parts[1] || "",
      state: parts.length > 4 ? parts[3] : parts[2] || "",
      zipCode: parts.length > 4 ? parts[4] : parts[3] || "",
      country: parts.length > 5 ? parts[5] : parts[4] || "United States",
    };
  };

  // Format address components into a single string
  const formatAddress = (data: z.infer<typeof formSchema>) => {
    let address = data.address1;
    if (data.address2) address += ', ' + data.address2;
    address += ', ' + data.city;
    address += ', ' + data.state;
    address += ', ' + data.zipCode;
    address += ', ' + data.country;
    return address;
  };

  // Prepare website URL by ensuring it has http:// prefix
  const prepareWebsiteUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return "http://" + url;
  };

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const formattedData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        website: prepareWebsiteUrl(data.website),
        address: formatAddress(data),
        description: data.description,
        type: data.type,
      };

      const res = await apiRequest(
        "POST", 
        "/api/organizations", 
        formattedData
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      setOpen(false);
      toast({
        title: "Organization created",
        description: "The organization has been successfully created",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      const res = await apiRequest(
        "PATCH", 
        `/api/organizations/${data.id}`, 
        data.updates
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      setOpen(false);
      toast({
        title: "Organization updated",
        description: "The organization has been successfully updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete organization mutation
  const deleteOrgMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/organizations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: "Organization deleted",
        description: "The organization has been deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const formattedValues = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      website: prepareWebsiteUrl(values.website),
      address: formatAddress(values),
      description: values.description,
      type: values.type,
    };

    if (editingOrganization) {
      updateOrgMutation.mutate({
        id: editingOrganization.id,
        updates: formattedValues,
      });
    } else {
      createOrgMutation.mutate(values);
    }
  };

  // For opening the dialog and setting up for create or edit
  const handleOpenDialog = (org?: Organization) => {
    resetForm(org);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage all organizations in the system
          </p>
        </div>
        <Button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            resetForm(); // Reset the form before opening dialog
            setOpen(true); // Directly open the dialog
          }} 
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Organization
        </Button>
      </div>

      {/* Organizations List */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-6 w-6" />
                    <p>Failed to load organizations</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/organizations'] })}
                    >
                      Try again
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : organizations && organizations.length > 0 ? (
              organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {org.name}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">
                    {org.type || "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {org.email || "N/A"}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {org.phone || "N/A"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate max-w-[200px]">
                        {org.address || "No address provided"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(org)}
                        title="Edit organization"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          // Detect production environment
                          const isProduction = window.location.hostname.includes('.replit.app') || 
                                              window.location.hostname === 'production-hostname.com';
                          
                          if (isProduction) {
                            // Enhanced confirmation for production environment
                            const confirmText = `DELETE-${org.name.toUpperCase()}`;
                            const userInput = window.prompt(
                              `⚠️ WARNING: You are in PRODUCTION mode!\n\nThis will permanently delete organization "${org.name}" and may affect linked client data.\n\nTo confirm, type "${confirmText}" exactly:`
                            );
                            
                            if (userInput === confirmText) {
                              deleteOrgMutation.mutate(org.id);
                            } else {
                              toast({
                                title: "Deletion cancelled",
                                description: "Organization deletion was cancelled or confirmation text did not match.",
                              });
                            }
                          } else {
                            // Standard confirmation for development
                            if (confirm("Are you sure you want to delete this organization?")) {
                              deleteOrgMutation.mutate(org.id);
                            }
                          }
                        }}
                        title="Delete organization"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No organizations found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Organization Dialog */}
      <Dialog 
        open={open} 
        onOpenChange={(newOpen) => {
          setOpen(newOpen);
          // If dialog is closing, reset the form
          if (!newOpen) {
            form.reset();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOrganization ? "Edit Organization" : "Add New Organization"}
            </DialogTitle>
            <DialogDescription>
              {editingOrganization
                ? "Update the organization's information below."
                : "Fill out the form below to create a new organization."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit(onSubmit)(e);
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter organization name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email*</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" {...field} />
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
                      <FormLabel>Phone*</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (123) 456-7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="www.example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Website URL will be automatically formatted
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Type*</FormLabel>
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
                          <SelectItem value="nonprofit">Nonprofit</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                          <SelectItem value="educational">Educational</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="religious">Religious</SelectItem>
                          <SelectItem value="community">Community</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2">
                  <h3 className="text-lg font-medium mb-2">Address Information</h3>
                </div>

                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="address1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1*</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="address2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 2</FormLabel>
                        <FormControl>
                          <Input placeholder="Suite 100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City*</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province*</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal/Zip Code*</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country*</FormLabel>
                      <FormControl>
                        <Input placeholder="Country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Brief description of the organization"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createOrgMutation.isPending || updateOrgMutation.isPending
                  }
                >
                  {(createOrgMutation.isPending || updateOrgMutation.isPending) && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingOrganization ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}