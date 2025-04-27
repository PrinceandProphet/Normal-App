import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, AlertTriangle, Trash2, ClipboardEdit } from "lucide-react";
import LoadingWrapper from "@/components/loading-wrapper";
import AuthCheck from "@/components/auth-check";

import FundingOpportunityForm from "@/components/funding/funding-opportunity-form";
import FundingOpportunityCard from "@/components/funding/funding-opportunity-card";

export default function FundingOpportunitiesPage() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  
  const queryClient = useQueryClient();

  // Query to get all funding opportunities or those specific to the user's organization
  const { data: opportunities, isLoading: opportunitiesLoading } = useQuery({
    queryKey: ["/api/funding"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/funding");
      return await res.json();
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  // Query to get public funding opportunities (for comparison)
  const { data: publicOpportunities, isLoading: publicOpportunitiesLoading } = useQuery({
    queryKey: ["/api/funding/public"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/funding/public");
      return await res.json();
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  // Mutation to delete a funding opportunity
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/funding/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Funding opportunity deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/funding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funding/public"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete funding opportunity",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const handleOpenCreate = () => {
    setSelectedOpportunity(null);
    setIsOpen(true);
  };

  const handleEdit = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this funding opportunity? This action cannot be undone.")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleFormClose = () => {
    setIsOpen(false);
    setSelectedOpportunity(null);
  };

  // Filter displayed opportunities based on the active tab
  const filteredOpportunities = activeTab === "all" 
    ? opportunities 
    : activeTab === "mine" && user?.organizationId
      ? opportunities?.filter(o => o.organizationId === user.organizationId)
      : activeTab === "public"
        ? publicOpportunities
        : [];

  // Determine if the user can create funding opportunities
  const canCreateOpportunity = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <AuthCheck>
      <LoadingWrapper isLoading={opportunitiesLoading || publicOpportunitiesLoading}>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Funding Opportunities</h1>
              <p className="text-muted-foreground">
                View and manage available funding opportunities for disaster recovery
              </p>
            </div>
            {canCreateOpportunity && (
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Opportunity
              </Button>
            )}
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Opportunities</TabsTrigger>
              {user?.organizationId && (
                <TabsTrigger value="mine">My Organization</TabsTrigger>
              )}
              <TabsTrigger value="public">Public Only</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4 mt-4">
              {opportunities?.length === 0 ? (
                <EmptyState 
                  title="No funding opportunities available"
                  description="There are currently no funding opportunities available."
                  canCreate={canCreateOpportunity}
                  onCreate={handleOpenCreate}
                />
              ) : (
                <OpportunitiesGrid 
                  opportunities={opportunities} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
                  user={user}
                />
              )}
            </TabsContent>
            
            {user?.organizationId && (
              <TabsContent value="mine" className="space-y-4 mt-4">
                {filteredOpportunities?.length === 0 ? (
                  <EmptyState 
                    title="No organization-specific opportunities"
                    description="Your organization does not have any funding opportunities set up."
                    canCreate={canCreateOpportunity}
                    onCreate={handleOpenCreate}
                  />
                ) : (
                  <OpportunitiesGrid 
                    opportunities={filteredOpportunities} 
                    onEdit={handleEdit} 
                    onDelete={handleDelete} 
                    user={user}
                  />
                )}
              </TabsContent>
            )}
            
            <TabsContent value="public" className="space-y-4 mt-4">
              {publicOpportunities?.length === 0 ? (
                <EmptyState 
                  title="No public funding opportunities"
                  description="There are currently no public funding opportunities available."
                  canCreate={canCreateOpportunity}
                  onCreate={handleOpenCreate}
                />
              ) : (
                <OpportunitiesGrid 
                  opportunities={publicOpportunities} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
                  user={user}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedOpportunity ? "Edit Funding Opportunity" : "Create Funding Opportunity"}
              </DialogTitle>
            </DialogHeader>
            <FundingOpportunityForm 
              opportunity={selectedOpportunity} 
              onClose={handleFormClose}
            />
          </DialogContent>
        </Dialog>
      </LoadingWrapper>
    </AuthCheck>
  );
}

// Component for the grid display of funding opportunities
function OpportunitiesGrid({ opportunities, onEdit, onDelete, user }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {opportunities?.map((opportunity) => (
        <FundingOpportunityCard 
          key={opportunity.id} 
          opportunity={opportunity} 
          onEdit={onEdit} 
          onDelete={onDelete}
          user={user}
        />
      ))}
    </div>
  );
}

// Component for empty state
function EmptyState({ title, description, canCreate, onCreate }) {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
        {canCreate && (
          <Button onClick={onCreate} className="mt-4">
            <Plus className="mr-2 h-4 w-4" /> Add Funding Opportunity
          </Button>
        )}
      </CardContent>
    </Card>
  );
}