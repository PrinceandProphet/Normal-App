import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useClientContext } from "@/hooks/use-client-context";
import { apiRequest, queryClient as globalQueryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, AlertTriangle, Trash2, ClipboardEdit, CreditCard, Award, FileCheck } from "lucide-react";
import LoadingWrapper from "@/components/loading-wrapper";
import AuthCheck from "@/components/auth-check";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import FundingOpportunityForm from "@/components/funding/funding-opportunity-form";
import FundingOpportunityCard from "@/components/funding/funding-opportunity-card";

export default function FundingOpportunitiesPage() {
  const { user } = useAuth();
  const { selectedClient } = useClientContext();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [currentOpportunityId, setCurrentOpportunityId] = useState<number | null>(null);
  
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

  // Query to get opportunity matches for the selected client
  const { data: clientMatches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["/api/matching/survivors", selectedClient?.id, "matches"],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const res = await apiRequest("GET", `/api/matching/survivors/${selectedClient.id}/matches`);
      return await res.json();
    },
    enabled: !!selectedClient?.id,
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

  // Mutation to apply for a grant
  const applyMutation = useMutation({
    mutationFn: async (opportunityId: number) => {
      if (!selectedClient?.id) {
        throw new Error("No client selected");
      }
      
      const res = await apiRequest("POST", `/api/matching/apply/${opportunityId}/survivors/${selectedClient.id}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grant application submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matching/survivors", selectedClient?.id, "matches"] });
      setApplyDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit grant application",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Form setup for award grant
  const awardGrantForm = useForm({
    resolver: zodResolver(z.object({
      awardAmount: z.number().min(0, "Award amount must be non-negative"),
      notes: z.string().optional(),
    })),
    defaultValues: {
      awardAmount: 0,
      notes: "",
    },
  });

  // Mutation to award a grant
  const awardMutation = useMutation({
    mutationFn: async (data: { opportunityId: number, awardData: any }) => {
      if (!selectedClient?.id) {
        throw new Error("No client selected");
      }
      
      const res = await apiRequest(
        "POST", 
        `/api/matching/award/${data.opportunityId}/survivors/${selectedClient.id}`, 
        data.awardData
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grant awarded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matching/survivors", selectedClient?.id, "matches"] });
      // Also invalidate capital sources to show the new grant in capital stack
      queryClient.invalidateQueries({ queryKey: ["/api/capital-sources"] });
      setAwardDialogOpen(false);
      awardGrantForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to award grant",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Mutation to mark a grant as funded
  const fundMutation = useMutation({
    mutationFn: async (opportunityId: number) => {
      if (!selectedClient?.id) {
        throw new Error("No client selected");
      }
      
      const res = await apiRequest(
        "POST", 
        `/api/matching/fund/${opportunityId}/survivors/${selectedClient.id}`, 
        {}
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grant marked as funded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matching/survivors", selectedClient?.id, "matches"] });
      // Also invalidate capital sources to update the grant status in capital stack
      queryClient.invalidateQueries({ queryKey: ["/api/capital-sources"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark grant as funded",
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

  const handleApplyClick = (opportunityId: number) => {
    setCurrentOpportunityId(opportunityId);
    setApplyDialogOpen(true);
  };

  const handleAwardClick = (opportunityId: number) => {
    setCurrentOpportunityId(opportunityId);
    
    // Find the opportunity to pre-fill the award amount
    const opportunity = opportunities?.find(o => o.id === opportunityId);
    if (opportunity && opportunity.awardAmount) {
      awardGrantForm.setValue('awardAmount', Number(opportunity.awardAmount));
    }
    
    setAwardDialogOpen(true);
  };

  const handleFundClick = async (opportunityId: number) => {
    if (confirm("Are you sure you want to mark this grant as funded? This will update the client's capital stack.")) {
      await fundMutation.mutateAsync(opportunityId);
    }
  };

  const handleApplySubmit = async () => {
    if (currentOpportunityId) {
      await applyMutation.mutateAsync(currentOpportunityId);
    }
  };

  const handleAwardSubmit = async (values: any) => {
    if (currentOpportunityId) {
      await awardMutation.mutateAsync({
        opportunityId: currentOpportunityId,
        awardData: values
      });
    }
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

  // Check if viewing as a client
  const isViewingAsClient = !!selectedClient;

  // Function to find a match for a specific opportunity
  const findMatch = (opportunityId: number) => {
    return clientMatches?.find(match => match.opportunityId === opportunityId);
  };

  return (
    <AuthCheck>
      <LoadingWrapper isLoading={opportunitiesLoading || publicOpportunitiesLoading || matchesLoading}>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Funding Opportunities</h1>
              <p className="text-muted-foreground">
                View and manage available funding opportunities for disaster recovery
              </p>
              {selectedClient && (
                <Badge className="mt-2" variant="outline">
                  Viewing as: {selectedClient.name}
                </Badge>
              )}
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
                  selectedClient={selectedClient}
                  clientMatches={clientMatches}
                  onApplyClick={handleApplyClick}
                  onAwardClick={handleAwardClick}
                  onFundClick={handleFundClick}
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
                    selectedClient={selectedClient}
                    clientMatches={clientMatches}
                    onApplyClick={handleApplyClick}
                    onAwardClick={handleAwardClick}
                    onFundClick={handleFundClick}
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
                  selectedClient={selectedClient}
                  clientMatches={clientMatches}
                  onApplyClick={handleApplyClick}
                  onAwardClick={handleAwardClick}
                  onFundClick={handleFundClick}
                />
              )}
            </TabsContent>
          </Tabs>

          {/* Grant Applications Section - Only visible when viewing as a client */}
          {selectedClient && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Grant Applications</h2>
              
              {clientMatches.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Grant Applications</h3>
                    <p className="text-muted-foreground">
                      {selectedClient.name} has not applied for any grants yet. 
                      Apply for grants from the list above.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {clientMatches.map((match) => {
                    const opportunity = opportunities?.find(o => o.id === match.opportunityId);
                    if (!opportunity) return null;

                    return (
                      <Card key={match.id} className="border">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{opportunity.name}</CardTitle>
                              <CardDescription>
                                {opportunity.description}
                              </CardDescription>
                            </div>
                            <GrantStatusBadge status={match.status} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between">
                              <div className="text-sm text-muted-foreground">Organization</div>
                              <div className="font-medium">
                                {opportunities?.find(o => o.id === opportunity.organizationId)?.name || "Unknown"}
                              </div>
                            </div>
                            
                            {match.status === "awarded" || match.status === "funded" ? (
                              <div className="flex justify-between">
                                <div className="text-sm text-muted-foreground">Award Amount</div>
                                <div className="font-medium">
                                  ${parseFloat(match.awardAmount).toLocaleString()}
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between">
                                <div className="text-sm text-muted-foreground">Potential Award</div>
                                <div className="font-medium">
                                  ${parseFloat(opportunity.awardAmount).toLocaleString()}
                                </div>
                              </div>
                            )}
                            
                            {match.appliedAt && (
                              <div className="flex justify-between">
                                <div className="text-sm text-muted-foreground">Applied Date</div>
                                <div className="font-medium">
                                  {new Date(match.appliedAt).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                            
                            {match.awardedAt && (
                              <div className="flex justify-between">
                                <div className="text-sm text-muted-foreground">Award Date</div>
                                <div className="font-medium">
                                  {new Date(match.awardedAt).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                            
                            {match.fundedAt && (
                              <div className="flex justify-between">
                                <div className="text-sm text-muted-foreground">Funded Date</div>
                                <div className="font-medium">
                                  {new Date(match.fundedAt).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                          {/* Apply Button - Only if not already applied */}
                          {match.status === "pending" && (
                            <Button 
                              variant="outline" 
                              onClick={() => handleApplyClick(opportunity.id)}
                            >
                              <CreditCard className="mr-2 h-4 w-4" /> Apply
                            </Button>
                          )}
                          
                          {/* Award Button - Only for admins/practitioners when status is "applied" */}
                          {match.status === "applied" && (user?.role === "admin" || user?.role === "super_admin") && (
                            <Button 
                              variant="outline" 
                              onClick={() => handleAwardClick(opportunity.id)}
                            >
                              <Award className="mr-2 h-4 w-4" /> Award Grant
                            </Button>
                          )}
                          
                          {/* Mark as Funded - Only for admins/practitioners when status is "awarded" */}
                          {match.status === "awarded" && (user?.role === "admin" || user?.role === "super_admin") && (
                            <Button 
                              variant="default" 
                              onClick={() => handleFundClick(opportunity.id)}
                            >
                              <FileCheck className="mr-2 h-4 w-4" /> Mark as Funded
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create/Edit Opportunity Dialog */}
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

        {/* Apply for Grant Dialog */}
        <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Grant</DialogTitle>
              <DialogDescription>
                You are applying for this grant on behalf of {selectedClient?.name}.
                The client will receive an email confirmation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p>Are you sure you want to submit this grant application?</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleApplySubmit} 
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Award Grant Dialog */}
        <Dialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Award Grant</DialogTitle>
              <DialogDescription>
                You are awarding this grant to {selectedClient?.name}.
                The client will receive an email notification.
              </DialogDescription>
            </DialogHeader>
            <Form {...awardGrantForm}>
              <form onSubmit={awardGrantForm.handleSubmit(handleAwardSubmit)} className="space-y-4 py-4">
                <FormField
                  control={awardGrantForm.control}
                  name="awardAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Award Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          placeholder="Enter amount" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={awardGrantForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Add any notes about this award" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button variant="outline" onClick={() => setAwardDialogOpen(false)}>Cancel</Button>
                  <Button 
                    type="submit" 
                    disabled={awardMutation.isPending}
                  >
                    {awardMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Award Grant
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </LoadingWrapper>
    </AuthCheck>
  );
}

// Component for the grid display of funding opportunities
function OpportunitiesGrid({ opportunities, onEdit, onDelete, user, selectedClient, clientMatches, onApplyClick, onAwardClick, onFundClick }) {
  // Function to find a match for a specific opportunity
  const findMatch = (opportunityId: number) => {
    return clientMatches?.find(match => match.opportunityId === opportunityId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {opportunities?.map((opportunity) => (
        <Card key={opportunity.id} className="flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-xl">{opportunity.name}</CardTitle>
              {selectedClient && (
                <>
                  {findMatch(opportunity.id) ? (
                    <GrantStatusBadge status={findMatch(opportunity.id).status} />
                  ) : (
                    <Badge variant="outline">Eligible</Badge>
                  )}
                </>
              )}
            </div>
            <CardDescription>{opportunity.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Award Amount</div>
                <div className="font-semibold text-lg">
                  ${parseFloat(opportunity.awardAmount).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Application Period</div>
                <div>
                  {new Date(opportunity.applicationStartDate).toLocaleDateString()} - {new Date(opportunity.applicationEndDate).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Organization</div>
                <div>
                  {opportunities.find(o => o.id === opportunity.organizationId)?.name || "Unknown"}
                </div>
              </div>
              <div>
                <Badge variant={opportunity.isPublic ? "default" : "outline"}>
                  {opportunity.isPublic ? "Public" : "Private"}
                </Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <div className="flex gap-2">
              {(user?.role === 'admin' || user?.role === 'super_admin') && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onEdit(opportunity)}
                  >
                    <ClipboardEdit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  {opportunity.organizationId === user?.organizationId || user?.role === 'super_admin' ? (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => onDelete(opportunity.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  ) : null}
                </>
              )}
            </div>

            {/* Show Apply button only when viewing as a client and no application exists yet */}
            {selectedClient && !findMatch(opportunity.id) && (
              <Button onClick={() => onApplyClick(opportunity.id)}>
                <CreditCard className="mr-2 h-4 w-4" /> Apply
              </Button>
            )}

            {/* Show Award button when viewing as a client, application exists, and in "applied" status */}
            {selectedClient && 
             findMatch(opportunity.id) && 
             findMatch(opportunity.id).status === "applied" && 
             (user?.role === "admin" || user?.role === "super_admin") && (
              <Button onClick={() => onAwardClick(opportunity.id)}>
                <Award className="mr-2 h-4 w-4" /> Award
              </Button>
            )}

            {/* Show Fund button when viewing as a client, application exists, and in "awarded" status */}
            {selectedClient && 
             findMatch(opportunity.id) && 
             findMatch(opportunity.id).status === "awarded" && 
             (user?.role === "admin" || user?.role === "super_admin") && (
              <Button onClick={() => onFundClick(opportunity.id)}>
                <FileCheck className="mr-2 h-4 w-4" /> Fund
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// Component to display grant application status badge
function GrantStatusBadge({ status }) {
  let variant = 'default';
  let label = status;

  switch (status) {
    case 'pending':
      variant = 'outline';
      label = 'Pending';
      break;
    case 'applied':
      variant = 'secondary';
      label = 'Applied';
      break;
    case 'awarded':
      variant = 'success';
      label = 'Awarded';
      break;
    case 'funded':
      variant = 'default';
      label = 'Funded';
      break;
    case 'rejected':
      variant = 'destructive';
      label = 'Rejected';
      break;
    default:
      variant = 'outline';
      break;
  }

  return <Badge variant={variant}>{label}</Badge>;
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