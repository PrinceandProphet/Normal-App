import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Organization } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmailSettings from "@/components/organization/email-settings";
import { ArrowLeft, Building2, Phone, Mail, Globe, MapPin, ExternalLink, Loader2 } from "lucide-react";

export default function OrganizationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const organizationId = parseInt(id);

  const { data: organization, isLoading, isError } = useQuery<Organization>({
    queryKey: [`/api/organizations/${organizationId}`],
    enabled: !isNaN(organizationId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !organization) {
    return (
      <div className="space-y-4">
        <Button variant="outline" className="gap-2" onClick={() => navigate("/admin/organizations")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Organizations
        </Button>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">
              Organization not found or failed to load organization details.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" className="gap-2" onClick={() => navigate("/admin/organizations")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Organizations
        </Button>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-3 rounded-lg">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
          <p className="text-muted-foreground capitalize">{organization.type || "Organization"}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>Contact and address information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{organization.email || "Not provided"}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{organization.phone || "Not provided"}</p>
                  </div>
                </div>
                
                {organization.website && (
                  <div className="flex items-start gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Website</p>
                      <a 
                        href={organization.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        {organization.website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
                
                {organization.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {organization.address.split(',').join('\n')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {organization.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{organization.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="email">Email Settings</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email">
              <EmailSettings organizationId={organizationId} />
            </TabsContent>
            
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Users</CardTitle>
                  <CardDescription>
                    Manage users who have access to this organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">User management will be implemented in a future update.</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="clients">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Clients</CardTitle>
                  <CardDescription>
                    Manage clients associated with this organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Client management will be implemented in a future update.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}