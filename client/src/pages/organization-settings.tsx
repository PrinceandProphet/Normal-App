import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";

// UI Components
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

// Icons
import {
  Building2,
  Settings,
  Users,
  Mail,
  Phone,
  MapPin,
  Globe,
  UserPlus,
  Trash,
  Edit,
  Lock,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  BarChart4,
  MessageSquare,
  FileText,
  Loader2,
  UserCog,
  ShieldCheck,
  Shield,
  Clock,
} from "lucide-react";

// Define validation schemas
const organizationFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  website: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal("")),
  address: z.object({
    street: z.string().min(1, { message: "Street address is required" }),
    city: z.string().min(1, { message: "City is required" }),
    state: z.string().min(1, { message: "State is required" }),
    zip: z.string().min(5, { message: "Please enter a valid ZIP code" }),
    country: z.string().min(1, { message: "Country is required" }),
  }),
  settings: z.object({
    enableClientPortal: z.boolean().default(true),
    enableTaskAssignment: z.boolean().default(true),
    enableDocumentManagement: z.boolean().default(true),
    enableDirectMessaging: z.boolean().default(true),
    enableOpportunityMatching: z.boolean().default(true),
    requireTwoFactorAuth: z.boolean().default(false),
    allowClientSelfRegistration: z.boolean().default(false),
    dataRetentionPeriodDays: z.number().min(30).default(365),
  }),
});

const staffFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }).optional(),
  role: z.enum(["admin", "case_manager", "intake_specialist", "data_analyst", "volunteer"]),
  title: z.string().optional(),
  permissions: z.object({
    canManageClients: z.boolean().default(true),
    canManageStaff: z.boolean().default(false),
    canViewReports: z.boolean().default(true),
    canEditOrganizationSettings: z.boolean().default(false),
    canManageDocuments: z.boolean().default(true),
    canSendMessages: z.boolean().default(true),
  }),
});

const emailConfigSchema = z.object({
  fromName: z.string().min(2, { message: "From name must be at least 2 characters" }),
  fromEmail: z.string().email({ message: "Please enter a valid email" }),
  replyToEmail: z.string().email({ message: "Please enter a valid email" }).optional(),
  enableEmailNotifications: z.boolean().default(true),
  emailFooterText: z.string().optional(),
  customDomain: z.string().optional(),
  domainVerified: z.boolean().default(false),
  emailSignature: z.string().optional(),
  defaultEmailTemplateId: z.string().optional(),
});

// Define types
type Organization = z.infer<typeof organizationFormSchema>;
type StaffMember = z.infer<typeof staffFormSchema> & {
  id: number;
  status: "active" | "inactive" | "pending";
  avatarUrl?: string;
  lastActive?: string;
};

export default function OrganizationSettings() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false);
  const [isEditStaffDialogOpen, setIsEditStaffDialogOpen] = useState(false);
  const [selectedStaffMember, setSelectedStaffMember] = useState<StaffMember | null>(null);

  // If user is not an admin or super_admin, redirect to home
  if (user && user.role !== "admin" && user.role !== "super_admin") {
    navigate("/");
    return null;
  }

  // Fetch organization data
  const {
    data: organization,
    isLoading: isOrganizationLoading,
    error: organizationError,
  } = useQuery<Organization>({
    queryKey: ["/api/organizations", id],
    enabled: !!id,
  });

  // Fetch staff members
  const { 
    data: staffMembers = [], 
    isLoading: isStaffLoading,
    error: staffError,
  } = useQuery<StaffMember[]>({
    queryKey: ["/api/organizations/staff", id],
    enabled: !!id,
  });

  // Setup form for organization settings
  const organizationForm = useForm<Organization>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: "",
      description: "",
      email: "",
      phone: "",
      website: "",
      address: {
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "United States",
      },
      settings: {
        enableClientPortal: true,
        enableTaskAssignment: true,
        enableDocumentManagement: true,
        enableDirectMessaging: true,
        enableOpportunityMatching: true,
        requireTwoFactorAuth: false,
        allowClientSelfRegistration: false,
        dataRetentionPeriodDays: 365,
      },
    },
    values: organization || undefined,
  });

  // Setup form for adding/editing staff
  const staffForm = useForm<Omit<StaffMember, "id" | "status" | "avatarUrl" | "lastActive">>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "case_manager",
      title: "",
      permissions: {
        canManageClients: true,
        canManageStaff: false,
        canViewReports: true,
        canEditOrganizationSettings: false,
        canManageDocuments: true,
        canSendMessages: true,
      },
    },
  });

  // Setup form for email configuration
  const emailConfigForm = useForm({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      fromName: organization?.name || "",
      fromEmail: organization?.email || "",
      replyToEmail: organization?.email || "",
      enableEmailNotifications: true,
      emailFooterText: "",
      customDomain: "",
      domainVerified: false,
      emailSignature: "",
      defaultEmailTemplateId: "",
    },
  });

  // Mutations
  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: Organization) => {
      const response = await apiRequest("PUT", `/api/organizations/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Organization updated",
        description: "Organization settings have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addStaffMutation = useMutation({
    mutationFn: async (data: Omit<StaffMember, "id" | "status" | "avatarUrl" | "lastActive">) => {
      const response = await apiRequest("POST", `/api/organizations/${id}/staff`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Staff member added",
        description: "The staff member has been successfully added to the organization.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/staff", id] });
      setIsAddStaffDialogOpen(false);
      staffForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding staff member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (data: StaffMember) => {
      const response = await apiRequest("PUT", `/api/organizations/${id}/staff/${data.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Staff member updated",
        description: "The staff member has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/staff", id] });
      setIsEditStaffDialogOpen(false);
      setSelectedStaffMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating staff member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: number) => {
      const response = await apiRequest("DELETE", `/api/organizations/${id}/staff/${staffId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Staff member removed",
        description: "The staff member has been successfully removed from the organization.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/staff", id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing staff member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateEmailConfigMutation = useMutation({
    mutationFn: async (data: z.infer<typeof emailConfigSchema>) => {
      const response = await apiRequest("PUT", `/api/organizations/${id}/email-config`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email configuration updated",
        description: "Email settings have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating email configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const onSubmitOrganizationForm = (data: Organization) => {
    updateOrganizationMutation.mutate(data);
  };

  const onSubmitStaffForm = (data: Omit<StaffMember, "id" | "status" | "avatarUrl" | "lastActive">) => {
    if (selectedStaffMember) {
      // Update existing staff member
      updateStaffMutation.mutate({
        ...data,
        id: selectedStaffMember.id,
        status: selectedStaffMember.status,
        avatarUrl: selectedStaffMember.avatarUrl,
        lastActive: selectedStaffMember.lastActive,
      });
    } else {
      // Add new staff member
      addStaffMutation.mutate(data);
    }
  };

  const onSubmitEmailConfigForm = (data: z.infer<typeof emailConfigSchema>) => {
    updateEmailConfigMutation.mutate(data);
  };

  const handleEditStaff = (staffMember: StaffMember) => {
    setSelectedStaffMember(staffMember);
    staffForm.reset({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone || "",
      role: staffMember.role,
      title: staffMember.title || "",
      permissions: staffMember.permissions,
    });
    setIsEditStaffDialogOpen(true);
  };

  const handleDeleteStaff = (staffId: number) => {
    if (confirm("Are you sure you want to remove this staff member? This action cannot be undone.")) {
      deleteStaffMutation.mutate(staffId);
    }
  };

  // Loading state
  if (isOrganizationLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading organization settings...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (organizationError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error Loading Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We encountered an error while loading the organization settings.
              Please try again or contact support if the problem persists.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/organizations", id] })}>
              Retry
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization's profile, staff, and configurations
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate(user?.role === "super_admin" ? "/admin" : "/org-admin")}
        >
          Back to Dashboard
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <Building2 className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users className="h-4 w-4 mr-2" />
            Staff Management
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email Configuration
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security & Compliance
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Form {...organizationForm}>
            <form onSubmit={organizationForm.handleSubmit(onSubmitOrganizationForm)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Profile</CardTitle>
                  <CardDescription>
                    Update your organization's basic information and contact details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={organizationForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter organization name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={organizationForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter email address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={organizationForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={organizationForm.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="https://www.example.org" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <FormField
                        control={organizationForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Brief description of your organization"
                                className="h-32 resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium mb-4">Address Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={organizationForm.control}
                        name="address.street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main St" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={organizationForm.control}
                        name="address.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={organizationForm.control}
                        name="address.state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            <FormControl>
                              <Input placeholder="State" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={organizationForm.control}
                        name="address.zip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP/Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="ZIP code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={organizationForm.control}
                        name="address.country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="United States">United States</SelectItem>
                                <SelectItem value="Canada">Canada</SelectItem>
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
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" type="button" onClick={() => organizationForm.reset()}>
                    Reset
                  </Button>
                  <Button type="submit" disabled={updateOrganizationMutation.isPending}>
                    {updateOrganizationMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Feature Settings</CardTitle>
                  <CardDescription>
                    Configure which features are enabled for your organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={organizationForm.control}
                      name="settings.enableClientPortal"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Client Portal</FormLabel>
                            <FormDescription>
                              Enable client login and self-service portal
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={organizationForm.control}
                      name="settings.enableTaskAssignment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Task Assignment</FormLabel>
                            <FormDescription>
                              Enable task assignment and tracking
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={organizationForm.control}
                      name="settings.enableDocumentManagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Document Management</FormLabel>
                            <FormDescription>
                              Enable document uploading and sharing
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={organizationForm.control}
                      name="settings.enableDirectMessaging"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Direct Messaging</FormLabel>
                            <FormDescription>
                              Enable direct messaging between staff and clients
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={organizationForm.control}
                      name="settings.enableOpportunityMatching"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Opportunity Matching</FormLabel>
                            <FormDescription>
                              Enable automated matching of clients to funding opportunities
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={organizationForm.control}
                      name="settings.allowClientSelfRegistration"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Client Self-Registration</FormLabel>
                            <FormDescription>
                              Allow clients to self-register for your organization
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="submit" disabled={updateOrganizationMutation.isPending}>
                    {updateOrganizationMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Settings
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </TabsContent>

        {/* Staff Management Tab */}
        <TabsContent value="staff">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Staff Management</CardTitle>
                <CardDescription>
                  Manage staff members, roles, and permissions
                </CardDescription>
              </div>
              <Button onClick={() => {
                staffForm.reset({
                  name: "",
                  email: "",
                  phone: "",
                  role: "case_manager",
                  title: "",
                  permissions: {
                    canManageClients: true,
                    canManageStaff: false,
                    canViewReports: true,
                    canEditOrganizationSettings: false,
                    canManageDocuments: true,
                    canSendMessages: true,
                  },
                });
                setSelectedStaffMember(null);
                setIsAddStaffDialogOpen(true);
              }}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Staff Member
              </Button>
            </CardHeader>
            <CardContent>
              {isStaffLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : staffMembers.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staffMembers.map((staff) => (
                      <Card key={staff.id} className="overflow-hidden">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={staff.avatarUrl} alt={staff.name} />
                            <AvatarFallback>{staff.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 overflow-hidden">
                            <CardTitle className="text-base truncate">{staff.name}</CardTitle>
                            <CardDescription className="truncate">{staff.email}</CardDescription>
                          </div>
                          <Badge
                            variant={staff.status === "active" ? "default" : staff.status === "pending" ? "outline" : "secondary"}
                            className="ml-auto"
                          >
                            {staff.status === "active" ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : staff.status === "pending" ? (
                              <HelpCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <X className="h-3 w-3 mr-1" />
                            )}
                            {staff.status.charAt(0).toUpperCase() + staff.status.slice(1)}
                          </Badge>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <UserCog className="h-3.5 w-3.5" />
                              <span>Role:</span>
                            </div>
                            <div className="font-medium capitalize">
                              {staff.role.replace(/_/g, " ")}
                            </div>
                            
                            {staff.title && (
                              <>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Globe className="h-3.5 w-3.5" />
                                  <span>Title:</span>
                                </div>
                                <div className="font-medium">
                                  {staff.title}
                                </div>
                              </>
                            )}
                            
                            {staff.lastActive && (
                              <>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>Last Active:</span>
                                </div>
                                <div className="font-medium">
                                  {new Date(staff.lastActive).toLocaleDateString()}
                                </div>
                              </>
                            )}
                          </div>
                          
                          <div className="mt-3 flex flex-wrap gap-1">
                            {staff.permissions.canManageClients && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800 border-blue-200">
                                Manage Clients
                              </Badge>
                            )}
                            {staff.permissions.canManageStaff && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-800 border-purple-200">
                                Manage Staff
                              </Badge>
                            )}
                            {staff.permissions.canEditOrganizationSettings && (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
                                Edit Settings
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-between pt-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteStaff(staff.id)}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditStaff(staff)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium mb-1">No Staff Members Yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    Add staff members to your organization to help manage clients, documents, and more.
                  </p>
                  <Button className="mt-6" onClick={() => setIsAddStaffDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Your First Staff Member
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Staff Dialog */}
          <Dialog open={isAddStaffDialogOpen} onOpenChange={setIsAddStaffDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
                <DialogDescription>
                  Add a new staff member to your organization. They will receive an email invitation.
                </DialogDescription>
              </DialogHeader>
              <Form {...staffForm}>
                <form onSubmit={staffForm.handleSubmit(onSubmitStaffForm)} className="space-y-4">
                  <FormField
                    control={staffForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={staffForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={staffForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={staffForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter job title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={staffForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="case_manager">Case Manager</SelectItem>
                            <SelectItem value="intake_specialist">Intake Specialist</SelectItem>
                            <SelectItem value="data_analyst">Data Analyst</SelectItem>
                            <SelectItem value="volunteer">Volunteer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          This determines the user's base access level
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Permissions</h4>
                    
                    <FormField
                      control={staffForm.control}
                      name="permissions.canManageClients"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Manage Clients</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={staffForm.control}
                      name="permissions.canManageStaff"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Manage Staff</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={staffForm.control}
                      name="permissions.canViewReports"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">View Reports</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={staffForm.control}
                      name="permissions.canEditOrganizationSettings"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Edit Organization Settings</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={staffForm.control}
                      name="permissions.canManageDocuments"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Manage Documents</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={staffForm.control}
                      name="permissions.canSendMessages"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Send Messages</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button 
                      variant="outline" 
                      type="button" 
                      onClick={() => setIsAddStaffDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addStaffMutation.isPending}>
                      {addStaffMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Staff Member"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Edit Staff Dialog */}
          <Dialog open={isEditStaffDialogOpen} onOpenChange={setIsEditStaffDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Staff Member</DialogTitle>
                <DialogDescription>
                  Update information and permissions for this staff member.
                </DialogDescription>
              </DialogHeader>
              <Form {...staffForm}>
                <form onSubmit={staffForm.handleSubmit(onSubmitStaffForm)} className="space-y-4">
                  <FormField
                    control={staffForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={staffForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={staffForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={staffForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter job title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={staffForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="case_manager">Case Manager</SelectItem>
                            <SelectItem value="intake_specialist">Intake Specialist</SelectItem>
                            <SelectItem value="data_analyst">Data Analyst</SelectItem>
                            <SelectItem value="volunteer">Volunteer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          This determines the user's base access level
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Permissions</h4>
                    
                    <FormField
                      control={staffForm.control}
                      name="permissions.canManageClients"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Manage Clients</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={staffForm.control}
                      name="permissions.canManageStaff"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Manage Staff</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={staffForm.control}
                      name="permissions.canViewReports"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">View Reports</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={staffForm.control}
                      name="permissions.canEditOrganizationSettings"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Edit Organization Settings</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={staffForm.control}
                      name="permissions.canManageDocuments"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Manage Documents</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={staffForm.control}
                      name="permissions.canSendMessages"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Send Messages</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button 
                      variant="outline" 
                      type="button" 
                      onClick={() => setIsEditStaffDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateStaffMutation.isPending}>
                      {updateStaffMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Email Configuration Tab */}
        <TabsContent value="email">
          <Form {...emailConfigForm}>
            <form onSubmit={emailConfigForm.handleSubmit(onSubmitEmailConfigForm)}>
              <Card>
                <CardHeader>
                  <CardTitle>Email Configuration</CardTitle>
                  <CardDescription>
                    Configure how emails are sent from your organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={emailConfigForm.control}
                      name="fromName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Organization Name" {...field} />
                          </FormControl>
                          <FormDescription>
                            Name displayed in the From field of emails
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={emailConfigForm.control}
                      name="fromEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Email</FormLabel>
                          <FormControl>
                            <Input placeholder="no-reply@organization.org" {...field} />
                          </FormControl>
                          <FormDescription>
                            Email address displayed in the From field
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={emailConfigForm.control}
                      name="replyToEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reply-To Email (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="contact@organization.org" {...field} />
                          </FormControl>
                          <FormDescription>
                            Email address recipients will reply to
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={emailConfigForm.control}
                      name="enableEmailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 h-full">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                              Enable email notifications for users
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Email Domain Settings</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure a custom domain for sending emails. This allows emails to appear as if they're coming directly from your organization's domain.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={emailConfigForm.control}
                        name="customDomain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Domain</FormLabel>
                            <FormControl>
                              <Input placeholder="mail.yourdomain.org" {...field} />
                            </FormControl>
                            <FormDescription>
                              Domain used for sending emails
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={emailConfigForm.control}
                        name="domainVerified"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 h-full">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Domain Verification</FormLabel>
                              <FormDescription>
                                {field.value
                                  ? "Domain has been verified"
                                  : "Domain is not verified yet"}
                              </FormDescription>
                            </div>
                            <Badge variant={field.value ? "default" : "outline"}>
                              {field.value ? (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Verified
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Not Verified
                                </>
                              )}
                            </Badge>
                          </FormItem>
                        )}
                      />
                    </div>

                    {!emailConfigForm.watch("domainVerified") && emailConfigForm.watch("customDomain") && (
                      <div className="mt-4 p-4 rounded-lg bg-muted">
                        <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                          <HelpCircle className="h-4 w-4" />
                          Domain Verification Instructions
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          To verify your domain, add the following DNS records:
                        </p>
                        <div className="bg-background p-3 rounded text-xs font-mono mb-3 overflow-x-auto">
                          <p>Type: TXT</p>
                          <p>Host: @</p>
                          <p>Value: disaster-planning-verify=123456789</p>
                          <p>TTL: 3600</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Verify Domain
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Email Content Settings</h3>
                    
                    <FormField
                      control={emailConfigForm.control}
                      name="emailFooterText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Footer Text</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="This email was sent by Organization Name. If you received this in error, please contact us."
                              className="min-h-20"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Text to appear at the bottom of all emails
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="mt-4">
                      <FormField
                        control={emailConfigForm.control}
                        name="emailSignature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Signature</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Best regards,
Organization Team
123-456-7890
www.organization.org"
                                className="min-h-24"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Signature for emails sent by staff members
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" type="button" onClick={() => emailConfigForm.reset()}>
                    Reset
                  </Button>
                  <Button type="submit" disabled={updateEmailConfigMutation.isPending}>
                    {updateEmailConfigMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Email Settings
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </TabsContent>

        {/* Security & Compliance Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security & Compliance Settings</CardTitle>
              <CardDescription>
                Configure security settings and compliance requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={organizationForm.control}
                  name="settings.requireTwoFactorAuth"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Two-Factor Authentication</FormLabel>
                        <FormDescription>
                          Require 2FA for all staff members
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={organizationForm.control}
                  name="settings.dataRetentionPeriodDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Retention Period (Days)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={30} 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of days to retain client data (minimum 30 days)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-medium">Compliance Requirements</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-start p-4 rounded-lg border">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-50 flex items-center justify-center mr-4">
                      <ShieldCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Data Privacy Compliance</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your organization is required to maintain compliance with data privacy regulations,
                        including proper handling of personal identifiable information (PII).
                      </p>
                      <div className="mt-3">
                        <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                          GDPR
                        </Badge>
                        <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-800 border-blue-200">
                          CCPA
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start p-4 rounded-lg border">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-amber-50 flex items-center justify-center mr-4">
                      <Lock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Security Requirements</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Security measures required for your organization including password policies,
                        access controls, and data encryption.
                      </p>
                      <Button variant="link" className="p-0 h-auto text-amber-600 font-normal mt-2">
                        View Security Assessment
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start p-4 rounded-lg border">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-green-50 flex items-center justify-center mr-4">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Audit Logging</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        System maintains detailed logs of all user activity for compliance
                        and security purposes. Logs are retained according to your data retention policy.
                      </p>
                      <Button variant="link" className="p-0 h-auto text-green-600 font-normal mt-2">
                        View Audit Logs
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Security Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <h4 className="text-sm font-medium">Security Officer</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        The person responsible for security at your organization.
                      </p>
                      <Input 
                        className="mt-3" 
                        placeholder="Security Officer Name" 
                      />
                      <Input 
                        className="mt-2" 
                        placeholder="security@organization.org" 
                      />
                    </div>
                    
                    <div className="p-4 rounded-lg border">
                      <h4 className="text-sm font-medium">Data Privacy Officer</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        The person responsible for data privacy at your organization.
                      </p>
                      <Input 
                        className="mt-3" 
                        placeholder="Privacy Officer Name" 
                      />
                      <Input 
                        className="mt-2" 
                        placeholder="privacy@organization.org" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button">
                Reset
              </Button>
              <Button type="submit" onClick={() => organizationForm.handleSubmit(onSubmitOrganizationForm)()}>
                Save Security Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}