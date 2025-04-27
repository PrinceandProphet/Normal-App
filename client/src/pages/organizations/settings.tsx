import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building, Loader2 } from "lucide-react";
import { EmailConfiguration } from "@/components/email-configuration";
import type { Organization } from "@shared/schema";

export default function OrganizationSettingsPage() {
  const { toast } = useToast();
  const params = useParams();
  const [, navigate] = useLocation();
  const organizationId = params.organizationId ? parseInt(params.organizationId, 10) : null;
  const [activeTab, setActiveTab] = useState("email");

  // Fetch organization data
  const { data: organization, isLoading, isError } = useQuery<Organization>({
    queryKey: ['/api/organizations', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const res = await fetch(`/api/organizations/${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch organization details');
      return res.json();
    },
    enabled: !!organizationId,
  });

  // Handle organization update
  const handleOrgUpdate = (updatedOrg: Organization) => {
    // This function is passed to the configuration components
    // to handle updates to the organization data
    toast({
      title: "Settings Updated",
      description: "Organization settings have been updated successfully."
    });
  };

  if (isLoading) {
    return (
      <div className="container max-w-screen-xl py-8 space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError || !organization) {
    return (
      <div className="container max-w-screen-xl py-8 space-y-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-muted-foreground">Failed to load organization details.</p>
          <Button variant="outline" onClick={() => navigate('/admin/organizations')}>
            Return to Organizations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-screen-xl py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:space-y-0">
        <div>
          <Button 
            variant="ghost" 
            className="mb-2 -ml-3 gap-1 text-muted-foreground"
            onClick={() => navigate('/admin/organizations')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Organizations
          </Button>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-6 w-6 text-muted-foreground" />
            {organization.name} Settings
          </h1>
          <p className="text-muted-foreground">
            Manage settings and configuration for this organization
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>
        
        {/* Email Configuration */}
        <TabsContent value="email" className="space-y-4">
          <EmailConfiguration 
            organization={organization} 
            onUpdate={handleOrgUpdate} 
          />
        </TabsContent>
        
        {/* Notification Settings (placeholder) */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how notifications are delivered to organization members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This feature is coming soon. Notification settings will allow you to configure
                who receives different types of notifications and how they're delivered.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* General Settings (placeholder) */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Update general organization settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This feature is coming soon. General settings will allow you to update your
                organization's basic information, permissions, and privacy settings.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}