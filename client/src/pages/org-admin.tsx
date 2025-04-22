import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Save, Trash, Users, CreditCard } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Redirect } from "wouter";

// Define schemas for form validation
const addClientSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Valid email required" }).optional(),
  phone: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().default("United States"),
  status: z.string().default("intake"),
  notes: z.string().optional(),
});

const addFundingSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  type: z.string().min(1, { message: "Type is required" }),
  amount: z.string().min(1, { message: "Amount is required" }),
  deadline: z.string().optional(),
  description: z.string().optional(),
  eligibility: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  website: z.string().optional().transform(val => 
    val && val.trim() !== "" && !val.startsWith("http") ? `http://${val}` : val
  ),
});

type AddClientFormValues = z.infer<typeof addClientSchema>;
type AddFundingFormValues = z.infer<typeof addFundingSchema>;

export default function OrgAdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [fundingDialogOpen, setFundingDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("clients");

  // Fetch clients (survivors) for the organization
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/survivors"],
    enabled: user?.role === "admin" && !!user?.organizationId,
  });

  // Fetch funding opportunities (capital sources)
  const { data: fundingSources, isLoading: fundingLoading } = useQuery({
    queryKey: ["/api/capital-sources"],
    enabled: user?.role === "admin" && !!user?.organizationId,
  });

  // Form for adding clients
  const clientForm = useForm<AddClientFormValues>({
    resolver: zodResolver(addClientSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      status: "intake",
      notes: "",
    },
  });

  // Form for adding funding opportunities
  const fundingForm = useForm<AddFundingFormValues>({
    resolver: zodResolver(addFundingSchema),
    defaultValues: {
      name: "",
      type: "fema",
      amount: "",
      deadline: "",
      description: "",
      eligibility: "",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      website: "",
    },
  });

  // Mutation for adding a client
  const addClientMutation = useMutation({
    mutationFn: async (data: AddClientFormValues) => {
      // First create the user account
      const userResponse = await apiRequest(
        "POST",
        "/api/users",
        {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}@example.com`,
          userType: "survivor",
          role: "user",
        }
      );
      
      if (!userResponse.ok) {
        const error = await userResponse.json();
        throw new Error(error.message || "Failed to create client");
      }
      
      const user = await userResponse.json();
      
      // Then add the relationship to the organization
      const relationshipResponse = await apiRequest(
        "POST",
        "/api/organizations/survivors",
        {
          organizationId: user?.organizationId,
          survivorId: user.id,
          status: data.status,
          notes: data.notes,
          isPrimary: true,
        }
      );
      
      if (!relationshipResponse.ok) {
        const error = await relationshipResponse.json();
        throw new Error(error.message || "Failed to add client to organization");
      }
      
      return user;
    },
    onSuccess: () => {
      toast({
        title: "Client added successfully",
        description: "The client has been added to your organization",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/survivors"] });
      clientForm.reset();
      setClientDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to add client",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for adding a funding opportunity
  const addFundingMutation = useMutation({
    mutationFn: async (data: AddFundingFormValues) => {
      const response = await apiRequest(
        "POST",
        "/api/capital-sources",
        {
          ...data,
          organizationId: user?.organizationId,
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add funding opportunity");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Funding opportunity added successfully",
        description: "The funding opportunity has been added",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/capital-sources"] });
      fundingForm.reset();
      setFundingDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to add funding opportunity",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Only organization admins can access this page
  if (!authLoading && (!user || user.role !== "admin")) {
    return <Redirect to="/" />;
  }

  function onClientSubmit(data: AddClientFormValues) {
    addClientMutation.mutate(data);
  }

  function onFundingSubmit(data: AddFundingFormValues) {
    addFundingMutation.mutate(data);
  }

  // Function to format status for display
  function formatStatus(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Organization Dashboard</h1>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clients">
            <Users className="mr-2 h-4 w-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="funding">
            <CreditCard className="mr-2 h-4 w-4" />
            Funding Opportunities
          </TabsTrigger>
        </TabsList>
        
        {/* Clients Tab */}
        <TabsContent value="clients">
          <div className="flex justify-end mb-4">
            <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                  <DialogDescription>
                    Add a new client to your organization.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...clientForm}>
                  <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Client Details</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={clientForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name*</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={clientForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name*</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={clientForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={clientForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Address Information</h4>
                        
                        <FormField
                          control={clientForm.control}
                          name="address1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 1</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Street address" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={clientForm.control}
                          name="address2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 2</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Apt, Suite, Building (optional)" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={clientForm.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-2">
                            <FormField
                              control={clientForm.control}
                              name="state"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State/Province</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={clientForm.control}
                              name="zipCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Zip/Postal Code</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <FormField
                        control={clientForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="intake">Intake</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="on_hold">On Hold</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={clientForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Add any additional notes about this client"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        disabled={addClientMutation.isPending}
                      >
                        {addClientMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add Client
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          {clientsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : clients?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No clients found. Add your first client using the button above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clients?.map((client: any) => (
                <Card key={client.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{client.firstName} {client.lastName}</CardTitle>
                    <CardDescription>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {formatStatus(client.status || 'Intake')}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {client.email && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Email:</span> {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Phone:</span> {client.phone}
                      </div>
                    )}
                    {client.address1 && (
                      <div className="text-sm">
                        <span className="font-medium">Address:</span> {client.address1}
                        {client.city && `, ${client.city}`}
                        {client.state && `, ${client.state}`}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Funding Opportunities Tab */}
        <TabsContent value="funding">
          <div className="flex justify-end mb-4">
            <Dialog open={fundingDialogOpen} onOpenChange={setFundingDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Funding Opportunity
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Funding Opportunity</DialogTitle>
                  <DialogDescription>
                    Add a new funding opportunity for your clients.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...fundingForm}>
                  <form onSubmit={fundingForm.handleSubmit(onFundingSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Funding Details</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={fundingForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name*</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={fundingForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type*</FormLabel>
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
                                  <SelectItem value="fema">FEMA</SelectItem>
                                  <SelectItem value="grant">Grant</SelectItem>
                                  <SelectItem value="loan">Loan</SelectItem>
                                  <SelectItem value="insurance">Insurance</SelectItem>
                                  <SelectItem value="donation">Donation</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={fundingForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. $5,000 or Up to $10,000" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={fundingForm.control}
                          name="deadline"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Deadline</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={fundingForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Provide details about this funding opportunity"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={fundingForm.control}
                        name="eligibility"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Eligibility Requirements</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Who is eligible for this funding?"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <h3 className="text-lg font-medium">Contact Information</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={fundingForm.control}
                          name="contactPerson"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Person</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={fundingForm.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Email</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={fundingForm.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Phone</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={fundingForm.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormDescription>
                                http:// will be added automatically if not included
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        disabled={addFundingMutation.isPending}
                      >
                        {addFundingMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add Funding Opportunity
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          {fundingLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : fundingSources?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No funding opportunities found. Add your first funding opportunity using the button above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {fundingSources?.map((funding: any) => (
                <Card key={funding.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{funding.name}</CardTitle>
                    <CardDescription>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          {funding.type.toUpperCase()}
                        </span>
                        <span className="font-medium">{funding.amount}</span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {funding.description && (
                      <p className="text-sm mb-2 line-clamp-2">{funding.description}</p>
                    )}
                    {funding.deadline && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Deadline:</span> {new Date(funding.deadline).toLocaleDateString()}
                      </div>
                    )}
                    {funding.contactPerson && (
                      <div className="text-sm">
                        <span className="font-medium">Contact:</span> {funding.contactPerson}
                        {funding.contactEmail && ` (${funding.contactEmail})`}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}