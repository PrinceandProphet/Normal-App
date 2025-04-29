import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  format, 
  isToday, 
  isThisWeek, 
  parseISO, 
  startOfToday, 
  isSameMonth, 
  isSameDay, 
  isWeekend 
} from "date-fns";
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
  Filter,
  ChevronLeft,
  ChevronRight,
  CalendarCheck2,
  Plus,

} from "lucide-react";
import { Link } from "wouter";

export default function OrgDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Type definitions
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
  
  type Appointment = {
    id: number;
    title: string;
    date: Date;
    time: string;
    clientId: number;
    clientName: string;
    practitionerId: number;
    practitionerName: string;
    type: string;
    status: string;
    notes?: string;
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
  
  // Get appointments for the organization
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/organization", { organizationId: user?.organizationId }],
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
  
  // Use real appointments data if available, otherwise fallback to placeholder data
  const appointmentData = appointments?.length > 0 ? appointments : PLACEHOLDER_APPOINTMENTS;
  const pendingAppointments = appointmentData.length || 0;
  const practitionerCount = practitioners?.length || 0;

  // Filter today's appointments
  const todayAppointments = appointmentData.filter(appointment => 
    isToday(new Date(appointment.date))
  );

  // Filter this week's appointments
  const thisWeekAppointments = appointmentData.filter(appointment => 
    isThisWeek(new Date(appointment.date))
  );

  return (
    <div className="space-y-6">
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
              View Messages
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/survivors">
              <Users className="h-4 w-4 mr-2" />
              Manage Clients
            </Link>
          </Button>

          <Button asChild size="sm">
            <Link href="/survivors/new">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Client
            </Link>
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <CheckSquare className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="clients">
            <Users className="mr-2 h-4 w-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckSquare className="mr-2 h-4 w-4" />
            Tasks
          </TabsTrigger>
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
        
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Clients</CardTitle>
                <Button asChild size="sm">
                  <Link href="/survivors/new">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Client
                  </Link>
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
                  <Button asChild>
                    <Link href="/survivors/new">Add Your First Client</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Calendar</CardTitle>
              <CardDescription>Organization scheduled appointments</CardDescription>
            </CardHeader>
            <CardContent>
              {appointmentsLoading ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="border rounded-md p-4">
                  <div className="text-center py-4 text-muted-foreground">
                    {appointmentData && appointmentData.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-medium">Upcoming Appointments</h3>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {/* Schedule Appointment */}}
                          >
                            <CalendarCheck2 className="h-4 w-4 mr-2" />
                            Schedule New
                          </Button>
                        </div>
                        {appointmentData.map((appointment: any) => (
                          <div key={appointment.id} className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-start gap-2">
                              <Calendar className="h-4 w-4 mt-0.5 text-primary" />
                              <div>
                                <p className="font-medium">{appointment.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Client: {appointment.clientName}
                                </p>
                              </div>
                            </div>
                            <Badge variant={appointment.status === 'scheduled' ? "default" : "outline"}>
                              {appointment.status}
                            </Badge>
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
                          onClick={() => {/* Schedule Appointment */}}
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
          
          {/* Today's Appointments */}
          {todayAppointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Today's Appointments</CardTitle>
                <CardDescription>Appointments scheduled for today</CardDescription>
              </CardHeader>
              <CardContent>
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
                          {appointment.time} with {appointment.clientName}
                        </p>
                      </div>
                      <Badge className="ml-auto" variant="outline">
                        {appointment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <input 
                        className="w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Search tasks..."
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div 
                        key={task.id} 
                        className={`flex items-center justify-between gap-2 rounded-md border p-3 ${
                          task.urgent ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input 
                            type="checkbox" 
                            checked={task.completed} 
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div>
                            <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {task.text}
                            </p>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              {task.urgent && <span className="text-red-600 dark:text-red-400 font-medium">Urgent</span>}
                              {task.urgent && <span>•</span>}
                              <span>Stage: {String(task.stage || "Unknown")}</span>
                              <span>•</span>
                              <span>
                                Assigned to: {
                                  "assignedToName" in task 
                                    ? String(task.assignedToName || "Unassigned") 
                                    : "Unassigned"
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.urgent && (
                            <Badge variant="outline" className="bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400 border-red-200">
                              Urgent
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {task.stage}
                          </Badge>
                          <Button variant="ghost" size="icon">
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground mb-6">No tasks found</p>
                  <Button>Add Your First Task</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}