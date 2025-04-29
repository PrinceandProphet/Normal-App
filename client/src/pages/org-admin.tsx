import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Calendar, Users, ClipboardCheck, ArrowRight, CalendarClock, ListChecks } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { Redirect, useLocation } from "wouter";

// Define schema for adding a client
const addClientSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Valid email required" }).optional(),
  phone: z.string().optional(),
  status: z.string().default("intake"),
  notes: z.string().optional(),
});

type AddClientFormValues = z.infer<typeof addClientSchema>;

export default function OrgAdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [, navigate] = useLocation();

  // Fetch clients (survivors) for the organization
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/survivors"],
    enabled: user?.role === "admin" && !!user?.organizationId,
  });

  // Fetch practitioners for the organization
  const { data: practitioners, isLoading: practitionersLoading } = useQuery({
    queryKey: ["/api/organizations/practitioners"],
    enabled: user?.role === "admin" && !!user?.organizationId,
  });
  
  // Fetch tasks for the organization
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/action-plan/tasks/organization"],
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
      status: "intake",
      notes: "",
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
      
      const userData = await userResponse.json();
      
      // Then add the relationship to the organization
      const relationshipResponse = await apiRequest(
        "POST",
        "/api/organizations/survivors",
        {
          organizationId: user?.organizationId,
          survivorId: userData.id,
          status: data.status,
          notes: data.notes,
          isPrimary: true,
        }
      );
      
      if (!relationshipResponse.ok) {
        const error = await relationshipResponse.json();
        throw new Error(error.message || "Failed to add client to organization");
      }
      
      return userData;
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

  // Only organization admins can access this page
  if (!authLoading && (!user || user.role !== "admin")) {
    return <Redirect to="/" />;
  }

  function onClientSubmit(data: AddClientFormValues) {
    addClientMutation.mutate(data);
  }

  // Function to format status for display
  function formatStatus(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  }
  
  // Calculate stats
  const clientCount = clients?.length || 0;
  const openTaskCount = tasks?.filter((task: any) => !task.completed)?.length || 0;
  const practitionerCount = practitioners?.length || 0;
  
  // Get incomplete tasks for the upcoming tasks section
  const incompleteTasks = tasks?.filter((task: any) => !task.completed)?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Organization Dashboard</h1>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin/clients')}
          >
            <Users className="mr-2 h-4 w-4" />
            Manage Clients
          </Button>
        </div>
      </div>
      
      {/* Dashboard Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Clients Served</CardTitle>
            <CardDescription>Total clients in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {clientsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                clientCount
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
              View All Clients
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Open Tasks</CardTitle>
            <CardDescription>Tasks requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {tasksLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                openTaskCount
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/action-plan')}
            >
              View Tasks
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
            <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Client
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
            
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/messages')}>
              <Calendar className="mr-2 h-4 w-4" />
              View Messages
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Activity and Upcoming Tasks Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates in your organization</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-6 py-2">
              {clientsLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : clients && clients.length > 0 ? (
                <div className="space-y-4">
                  {clients.slice(0, 5).map((client: any, index: number) => (
                    <div key={client.id} className="flex items-center justify-between pb-2 border-b">
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Added {new Date(client.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/client/${client.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No recent activity to display
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => navigate('/admin/clients')}
            >
              View All Activity
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
        
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
            <CardDescription>Tasks requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-6 py-2">
              {tasksLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : incompleteTasks && incompleteTasks.length > 0 ? (
                <div className="space-y-4">
                  {incompleteTasks.map((task: any, index: number) => (
                    <div key={task.id} className="flex items-center justify-between pb-2 border-b">
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 h-2 w-2 rounded-full ${task.urgent ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div>
                          <p className="font-medium">{task.text}</p>
                          <p className="text-sm text-muted-foreground">
                            Stage: {task.stage.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No upcoming tasks
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => navigate('/action-plan')}
            >
              View All Tasks
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Staff Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Practitioners in your organization</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/organizations/settings')}
          >
            Manage Team
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {practitionersLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : practitioners && practitioners.length > 0 ? (
              <div className="space-y-2">
                {practitioners.slice(0, 3).map((practitioner: any) => (
                  <div key={practitioner.id} className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {practitioner.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium">{practitioner.name}</p>
                        <p className="text-sm text-muted-foreground">{practitioner.jobTitle || 'Team Member'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {practitioners.length > 3 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    + {practitioners.length - 3} more team members
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No team members found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}