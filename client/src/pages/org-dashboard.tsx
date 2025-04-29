import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { format, isToday, isThisWeek, parseISO } from "date-fns";
import { 
  Calendar, 
  Users, 
  Inbox, 
  CheckSquare, 
  Clock, 
  BuildingIcon, 
  ArrowUpRight, 
  UserPlus,
  AlertCircle,
  BellRing,
  Tag as TagIcon,
  Filter
} from "lucide-react";
import { Link } from "wouter";

export default function OrgDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // Define types for our data
  type Practitioner = {
    id: number;
    name: string;
    email: string;
    role: string;
  };

  type Survivor = {
    id: number;
    name: string;
    email: string;
    status: string;
  };

  type Task = {
    id: number;
    text: string;
    completed: boolean;
    urgent: boolean;
    stage: string;
    createdById: number;
    createdByType: string;
    assignedToId: number | null;
    assignedToType: string | null;
  };

  type Organization = {
    id: number;
    name: string;
    address: string;
    phoneNumber: string;
    email: string;
  };

  // Get organization members (practitioners)
  const { data: practitioners = [], isLoading: practitionersLoading } = useQuery<Practitioner[]>({
    queryKey: ["/api/organizations/practitioners", { organizationId: user?.organizationId }],
    enabled: !!user?.organizationId,
  });

  // Get organization survivors/clients
  const { data: survivors = [], isLoading: survivorsLoading } = useQuery<Survivor[]>({
    queryKey: ["/api/organizations/survivors", { organizationId: user?.organizationId }],
    enabled: !!user?.organizationId,
  });

  // Get tasks for organization
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/action-plan/tasks/organization", { organizationId: user?.organizationId }],
    enabled: !!user?.organizationId,
  });

  // Get current organization
  const { data: organization } = useQuery<Organization>({
    queryKey: ["/api/organizations/current", { organizationId: user?.organizationId }],
    enabled: !!user?.organizationId,
  });

  // Appointments/dummy calendar data
  const PLACEHOLDER_APPOINTMENTS = [
    { 
      id: 1, 
      title: "Intake Interview", 
      date: new Date(), 
      time: "9:00 AM", 
      clientId: 1,
      clientName: "Sarah Johnson",
      practitionerId: 1,
      practitionerName: "Dr. Mark Williams",
      type: "initial",
      status: "scheduled"
    },
    { 
      id: 2, 
      title: "Document Review", 
      date: new Date(Date.now() + 86400000), // tomorrow
      time: "2:30 PM", 
      clientId: 2,
      clientName: "Michael Stevens",
      practitionerId: 2,
      practitionerName: "Linda Roberts",
      type: "follow-up",
      status: "scheduled"
    },
    { 
      id: 3, 
      title: "Housing Assessment", 
      date: new Date(Date.now() + 86400000 * 2), // day after tomorrow
      time: "11:00 AM", 
      clientId: 3,
      clientName: "James Peterson",
      practitionerId: 1,
      practitionerName: "Dr. Mark Williams",
      type: "assessment",
      status: "scheduled"
    }
  ];

  // Statistics calculations
  const activeClients = survivors?.length || 0;
  const openTasks = tasks?.filter(task => !task.completed)?.length || 0;
  const completedTasks = tasks?.filter(task => task.completed)?.length || 0;
  const pendingAppointments = PLACEHOLDER_APPOINTMENTS.length || 0;
  const practitionerCount = practitioners?.length || 0;

  // Filter today's appointments
  const todayAppointments = PLACEHOLDER_APPOINTMENTS.filter(appointment => 
    isToday(appointment.date)
  );

  // Filter this week's appointments
  const thisWeekAppointments = PLACEHOLDER_APPOINTMENTS.filter(appointment => 
    isThisWeek(appointment.date)
  );

  return (
    <div className="container py-6">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organization Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {organization?.name || "Your Organization"} | Welcome, {user?.name}
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/messages">
                <Inbox className="h-4 w-4 mr-2" />
                Messages
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/profile">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Client
              </Link>
            </Button>
          </div>
        </div>
      </header>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="practitioners">Practitioners</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeClients}</div>
                <p className="text-xs text-muted-foreground">
                  {activeClients > 0 ? `${activeClients} clients registered` : "No clients yet"}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openTasks}</div>
                <p className="text-xs text-muted-foreground">
                  {completedTasks > 0 ? `${completedTasks} tasks completed` : "No completed tasks"}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scheduled Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingAppointments}</div>
                <p className="text-xs text-muted-foreground">
                  {todayAppointments.length > 0 
                    ? `${todayAppointments.length} appointments today` 
                    : "No appointments today"}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Practitioners</CardTitle>
                <BuildingIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{practitionerCount}</div>
                <p className="text-xs text-muted-foreground">
                  Staff members in your organization
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Upcoming Appointments and Recent Activities */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                {todayAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {todayAppointments.map(appointment => (
                      <div key={appointment.id} className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {appointment.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {`${format(appointment.date, "MMM d")} at ${appointment.time} with ${appointment.clientName}`}
                          </p>
                        </div>
                        <Badge className="ml-auto" variant="outline">
                          {appointment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No appointments scheduled for today</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <UserPlus className="h-4 w-4 text-blue-700" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">New client added</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <CheckSquare className="h-4 w-4 text-green-700" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">Task completed</p>
                      <p className="text-xs text-muted-foreground">4 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                      <BellRing className="h-4 w-4 text-amber-700" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">New grant opportunity match</p>
                      <p className="text-xs text-muted-foreground">Yesterday</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="practitioners" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Organization Practitioners</CardTitle>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Practitioner
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {practitionersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : practitioners && practitioners.length > 0 ? (
                <div className="space-y-4">
                  {practitioners.map(practitioner => (
                    <div key={practitioner.id} className="flex items-center gap-4 rounded-md border p-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" alt={practitioner.name} />
                        <AvatarFallback>{practitioner.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{practitioner.name}</p>
                        <p className="text-sm text-muted-foreground">{practitioner.email}</p>
                      </div>
                      <Badge variant="outline">{practitioner.role || "Practitioner"}</Badge>
                      <Button variant="ghost" size="icon">
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground mb-6">No practitioners found</p>
                  <Button>Add Your First Practitioner</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Clients</CardTitle>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {survivorsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : survivors && survivors.length > 0 ? (
                <div className="space-y-4">
                  {survivors.map(survivor => (
                    <div key={survivor.id} className="flex items-center gap-4 rounded-md border p-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" alt={survivor.name} />
                        <AvatarFallback>{survivor.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{survivor.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {survivor.email || "No email provided"}
                        </p>
                      </div>
                      <Badge variant="outline">{survivor.status || "Active"}</Badge>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/clients/${survivor.id}`}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground mb-6">No clients found</p>
                  <Button>Add Your First Client</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium">Today</h3>
                  <Separator className="my-2" />
                  {todayAppointments.length > 0 ? (
                    <div className="space-y-4 mt-3">
                      {todayAppointments.map(appointment => (
                        <div key={appointment.id} className="flex items-start gap-3">
                          <div className="w-14 text-right">
                            <p className="text-xs font-medium">{appointment.time}</p>
                          </div>
                          <div className="flex-1 rounded-md border p-3">
                            <p className="font-medium">{appointment.title}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <p className="text-xs text-muted-foreground">with {appointment.clientName}</p>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {appointment.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-16 text-center">
                      <p className="text-sm text-muted-foreground">No appointments today</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium">This Week</h3>
                  <Separator className="my-2" />
                  {thisWeekAppointments.length > 0 ? (
                    <div className="space-y-4 mt-3">
                      {thisWeekAppointments.map(appointment => (
                        <div key={appointment.id} className="flex items-start gap-3">
                          <div className="w-14 text-right">
                            <p className="text-xs font-medium">{format(appointment.date, "EEE")}</p>
                            <p className="text-[10px] text-muted-foreground">{appointment.time}</p>
                          </div>
                          <div className="flex-1 rounded-md border p-3">
                            <p className="font-medium">{appointment.title}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <p className="text-xs text-muted-foreground">with {appointment.clientName}</p>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {appointment.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-16 text-center">
                      <p className="text-sm text-muted-foreground">No appointments this week</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : tasks && tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-start gap-3 rounded-md border p-3">
                      <div className={`mt-0.5 h-5 w-5 rounded-full border ${
                        task.completed ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                      }`}>
                        {task.completed && (
                          <CheckSquare className="h-4 w-4 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.text}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <Badge variant="secondary">
                            {task.stage.replace('_', ' ')}
                          </Badge>
                          {task.urgent && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Urgent
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground ml-auto">
                            Assigned to {task.assignedToName || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground mb-6">No tasks found</p>
                  <Button>Create a New Task</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}