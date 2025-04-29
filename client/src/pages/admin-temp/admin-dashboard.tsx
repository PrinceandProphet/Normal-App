import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Save, Building2, Users, ArrowRight } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { Redirect, useLocation } from "wouter";

// Define the form validation schema
const createOrgSchema = z.object({
  organization: z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    type: z.string().min(1, { message: "Type is required" }),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default("United States"),
    countryCode: z.string().default("+1"),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().optional(),
  }).transform(data => {
    // Auto-prepend http:// to website URLs if missing
    if (data.website && data.website.trim() !== "" && !data.website.startsWith("http")) {
      data.website = `http://${data.website}`;
    }
    
    // Compile address for backend
    const addressParts = [
      data.address1,
      data.address2,
      data.city && data.state ? `${data.city}, ${data.state} ${data.zipCode || ''}` : (data.city || data.state || ''),
      data.country !== "United States" ? data.country : ''
    ].filter(Boolean);
    
    return {
      ...data,
      address: addressParts.join('\n').trim()
    };
  }),
  adminEmail: z.string().email({ message: "Valid email required" }),
  adminName: z.string().min(2, { message: "Name must be at least 2 characters" }).optional(),
  sendEmail: z.boolean().default(true),
});

type CreateOrgFormValues = z.infer<typeof createOrgSchema>;

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch organizations for the table listing
  const { data: organizations, isLoading: orgsLoading } = useQuery({
    queryKey: ["/api/organizations"],
    enabled: user?.role === "super_admin",
  });
  
  // Fetch clients for the dashboard stats
  const { data: survivors, isLoading: survivorsLoading } = useQuery({
    queryKey: ["/api/survivors"],
    enabled: user?.role === "super_admin",
  });

  // Form for creating a new organization and admin
  const form = useForm<CreateOrgFormValues>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: {
      organization: {
        name: "",
        type: "non_profit",
        address1: "",
        address2: "",
        city: "",
        state: "",
        zipCode: "",
        country: "United States",
        countryCode: "+1",
        phone: "",
        email: "",
        website: "",
      },
      adminEmail: "",
      adminName: "",
      sendEmail: true,
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: CreateOrgFormValues) => {
      const response = await apiRequest(
        "POST",
        "/api/users/create-organization-with-admin",
        data
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create organization");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Organization created successfully",
        description: "The organization and admin have been created",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to create organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Only super admins can access this page
  if (!authLoading && (!user || user.role !== "super_admin")) {
    return <Redirect to="/" />;
  }

  async function onSubmit(data: CreateOrgFormValues) {
    createOrgMutation.mutate(data);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin/clients')}
          >
            <Users className="mr-2 h-4 w-4" />
            All Clients
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin/organizations')}
          >
            <Building2 className="mr-2 h-4 w-4" />
            All Organizations
          </Button>
        </div>
      </div>
      
      {/* Dashboard Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Organizations</CardTitle>
            <CardDescription>Manage recovery organizations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {orgsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                organizations?.length || 0
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/admin/organizations')}
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Clients</CardTitle>
            <CardDescription>Manage client accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {survivorsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                survivors?.length || 0
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/admin/clients')}
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Quick Actions</CardTitle>
            <CardDescription>Perform common tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Organization
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Organization</DialogTitle>
                  <DialogDescription>
                    Create an organization and assign an administrator.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Organization Details</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="organization.name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Name*</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="organization.type"
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
                                  <SelectItem value="non_profit">Non-Profit</SelectItem>
                                  <SelectItem value="government">Government</SelectItem>
                                  <SelectItem value="private">Private</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Address Information</h4>
                        
                        <FormField
                          control={form.control}
                          name="organization.address1"
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
                          control={form.control}
                          name="organization.address2"
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
                            control={form.control}
                            name="organization.city"
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
                              control={form.control}
                              name="organization.state"
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
                              control={form.control}
                              name="organization.zipCode"
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
                        
                        <FormField
                          control={form.control}
                          name="organization.country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select country" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="United States">United States</SelectItem>
                                  <SelectItem value="Canada">Canada</SelectItem>
                                  <SelectItem value="Mexico">Mexico</SelectItem>
                                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                                  <SelectItem value="Australia">Australia</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex space-x-2">
                          <FormField
                            control={form.control}
                            name="organization.countryCode"
                            render={({ field }) => (
                              <FormItem className="w-24">
                                <FormLabel>Country Code</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="+1" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="+1">+1</SelectItem>
                                    <SelectItem value="+44">+44</SelectItem>
                                    <SelectItem value="+61">+61</SelectItem>
                                    <SelectItem value="+52">+52</SelectItem>
                                    <SelectItem value="+91">+91</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="organization.phone"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="(555) 555-5555" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="organization.email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Email</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="organization.website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Administrator Details</h3>
                      
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Important</AlertTitle>
                        <AlertDescription>
                          An admin account will be created or assigned to manage this organization.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="adminEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Admin Email*</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="adminName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Admin Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="sendEmail"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Send welcome email</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Send an email to the administrator with login instructions
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={createOrgMutation.isPending}
                      >
                        {createOrgMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Organization"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/admin/clients')}>
              <Users className="mr-2 h-4 w-4" />
              View All Clients
            </Button>

            <Button variant="outline" size="sm" className="w-full mt-2">
              <Save className="mr-2 h-4 w-4" />
              System Settings
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Organizations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Organizations</CardTitle>
          <CardDescription>
            The newest organizations added to the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orgsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !organizations || organizations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No organizations found
            </div>
          ) : (
            <div className="space-y-4">
              {organizations.slice(0, 3).map((org: any) => (
                <div key={org.id} className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-start">
                    <Building2 className="h-5 w-5 mt-0.5 mr-2 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-muted-foreground capitalize">{org.type}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin/organizations')}>
                    View
                  </Button>
                </div>
              ))}
              
              <div className="flex justify-center pt-2">
                <Button variant="link" onClick={() => navigate('/admin/organizations')}>
                  See all organizations
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}