import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Calendar, Users, ClipboardCheck, ArrowRight, CalendarClock, ListChecks, Settings, Mail } from "lucide-react";
import SystemSettings from "@/components/system-settings";
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings">("dashboard");
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

  // Only organization admins can access this page
  if (!authLoading && (!user || user.role !== "admin")) {
    return <Redirect to="/" />;
  }

  // Calculate stats
  const clientCount = clients?.length || 0;
  const openTaskCount = tasks?.filter((task: any) => !task.completed)?.length || 0;
  const practitionerCount = practitioners?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Organization Administration</h1>
        
        <div className="flex space-x-2">
          <Button
            variant={activeTab === "dashboard" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("dashboard")}
          >
            <Users className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === "settings" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("settings")}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>
      
      {activeTab === "dashboard" ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
            
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
                <Button variant="default" size="sm" className="w-full" onClick={() => setClientDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Client
                </Button>
                
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/messages')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  View Messages
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Organization Settings</h2>
          </div>
          
          {user?.organizationId && (
            <SystemSettings organizationId={user.organizationId} />
          )}
        </div>
      )}
    </div>
  );
}