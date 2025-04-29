import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle, Calendar, Users, ClipboardCheck, ArrowRight, CalendarRange, SquarePen } from "lucide-react";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Redirect, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function PractitionerDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [, navigate] = useLocation();

  // Fetch clients (survivors) assigned to this practitioner
  const { data: assignedClients = [], isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/practitioners/clients"],
    enabled: user?.role === "case_manager",
  });

  // Fetch tasks assigned to this practitioner
  const { data: assignedTasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/practitioners/tasks"],
    enabled: user?.role === "case_manager",
  });
  
  // Fetch upcoming appointments/follow-ups
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/practitioners/appointments"],
    enabled: user?.role === "case_manager",
  });

  // Only practitioners can access this page
  if (!authLoading && (!user || user.role !== "case_manager")) {
    return <Redirect to="/" />;
  }

  // Calculate stats
  const clientCount = assignedClients?.length || 0;
  const openTaskCount = assignedTasks?.filter((task: any) => !task.completed)?.length || 0;
  const completedTaskCount = assignedTasks?.filter((task: any) => task.completed)?.length || 0;
  const upcomingAppointmentsCount = appointments?.length || 0;
  
  // Get incomplete tasks for the upcoming tasks section
  const incompleteTasks = assignedTasks?.filter((task: any) => !task.completed)?.slice(0, 5) || [];
  
  // Get next few appointments
  const upcomingAppointments = appointments?.slice(0, 3) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Practitioner Dashboard</h1>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/practitioner/clients')}
          >
            <Users className="mr-2 h-4 w-4" />
            View All Clients
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="clients">
            <Users className="mr-2 h-4 w-4" />
            My Clients
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarRange className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>
        
        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Dashboard Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">My Clients</CardTitle>
                <CardDescription>Assigned clients</CardDescription>
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
                  onClick={() => setActiveTab("clients")}
                >
                  View Clients
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
                <CardTitle className="text-xl">Completed</CardTitle>
                <CardDescription>Tasks completed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {tasksLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    completedTaskCount
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/action-plan?filter=completed')}
                >
                  View Completed
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Upcoming</CardTitle>
                <CardDescription>Scheduled appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {appointmentsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    upcomingAppointmentsCount
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  size="sm" 
                  variant="outline"
                  onClick={() => setActiveTab("calendar")}
                >
                  View Calendar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Activity and Upcoming Tasks Section */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>My Tasks</CardTitle>
                <CardDescription>Tasks assigned to you</CardDescription>
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
                                Stage: {task.stage?.toUpperCase()}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/task/${task.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No open tasks
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
            
            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
                <CardDescription>Your scheduled appointments</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-6 py-2">
                  {appointmentsLoading ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingAppointments.map((appointment: any, index: number) => (
                        <div key={appointment.id} className="flex items-center justify-between pb-2 border-b">
                          <div className="flex items-start gap-2">
                            <Calendar className="h-4 w-4 mt-0.5 text-primary" />
                            <div>
                              <p className="font-medium">{appointment.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(appointment.date).toLocaleDateString()} at {new Date(appointment.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                          </div>
                          <Badge variant={appointment.confirmed ? "default" : "outline"}>
                            {appointment.confirmed ? "Confirmed" : "Pending"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No upcoming appointments
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setActiveTab("calendar")}
                >
                  View Calendar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* My Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Clients</CardTitle>
              <CardDescription>Clients assigned to you</CardDescription>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : assignedClients && assignedClients.length > 0 ? (
                <div className="space-y-4">
                  {assignedClients.map((client: any) => (
                    <div key={client.id} className="flex items-center justify-between border-b pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {client.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {client.email || 'No email provided'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={client.status === 'active' ? "default" : "outline"}>
                          {formatStatus(client.status)}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/client/${client.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No clients assigned to you
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Calendar</CardTitle>
              <CardDescription>Your scheduled appointments</CardDescription>
            </CardHeader>
            <CardContent>
              {appointmentsLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="border rounded-md p-4">
                  {/* This is a placeholder for a real calendar component */}
                  <div className="text-center py-8 text-muted-foreground">
                    {appointments && appointments.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="font-medium mb-4">Upcoming Appointments</h3>
                        {appointments.map((appointment: any) => (
                          <div key={appointment.id} className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-start gap-2">
                              <Calendar className="h-4 w-4 mt-0.5 text-primary" />
                              <div>
                                <p className="font-medium">{appointment.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(appointment.date).toLocaleDateString()} at {new Date(appointment.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Client: {appointment.clientName}
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/appointments/${appointment.id}`)}
                            >
                              <SquarePen className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p>No upcoming appointments</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={() => navigate('/appointments/new')}
                        >
                          Schedule New Appointment
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Function to format status for display
function formatStatus(status: string) {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}