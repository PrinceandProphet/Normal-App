import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings, Mail, Users, Buildings } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import EmailSettings from "@/components/organization/email-settings";
import { useAuth } from "@/hooks/use-auth";
import { Spinner } from "@/components/ui/spinner";

export default function OrganizationDetailsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("email");
  
  // Extract organization ID from URL
  useEffect(() => {
    const match = location.match(/\/admin\/organizations\/(\d+)/);
    if (match && match[1]) {
      setOrganizationId(parseInt(match[1]));
    }
  }, [location]);
  
  // Fetch organization details
  const { 
    data: organization, 
    isLoading, 
    isError,
  } = useQuery({
    queryKey: [`/api/organizations/${organizationId}`],
    enabled: !!organizationId,
  });
  
  // Check permissions - only super_admin or org admins can access
  const checkAccess = () => {
    if (!user) return false;
    if (user.role === "super_admin") return true;
    
    // Check if user is part of this organization with admin role
    if (user.organizationId === organizationId) {
      // Would need to also check their role in the organization
      return true;
    }
    
    return false;
  };
  
  // If no access, redirect to admin page
  useEffect(() => {
    if (user && !isLoading && !checkAccess()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view this organization's details.",
        variant: "destructive",
      });
      navigate("/admin");
    }
  }, [user, isLoading, organizationId, navigate, toast]);
  
  if (isLoading || !organization) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="gap-2" 
            onClick={() => navigate("/admin/organizations")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Organizations
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-medium">Error Loading Organization</h2>
              <p className="text-muted-foreground mt-2">
                Unable to load organization details. Please try again later.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="gap-2" 
          onClick={() => navigate("/admin/organizations")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organizations
        </Button>
      </div>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{organization.name}</h1>
          <p className="text-muted-foreground mt-1">
            {organization.type} • {organization.address}
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => navigate(`/admin/organizations`)}
        >
          <Settings className="h-4 w-4" />
          Edit Organization
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted w-full justify-start border-b p-0 h-11 rounded-none">
          <TabsTrigger 
            value="email" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-2 h-11"
          >
            <Mail className="h-4 w-4" />
            Email Settings
          </TabsTrigger>
          <TabsTrigger 
            value="members" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-2 h-11"
          >
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger 
            value="properties" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-2 h-11"
          >
            <Buildings className="h-4 w-4" />
            Properties
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="email" className="space-y-6">
          <EmailSettings organizationId={organizationId!} />
        </TabsContent>
        
        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Members</CardTitle>
              <CardDescription>
                Manage users that belong to this organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Member management will be implemented in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="properties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Properties</CardTitle>
              <CardDescription>
                Manage properties associated with this organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Property management will be implemented in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}