import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { 
  CheckCircle, 
  MoreHorizontal, 
  XCircle, 
  Clock, 
  Archive, 
  CreditCard, 
  Award, 
  FileCheck, 
  Loader2,
  User
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useClientContext } from "@/hooks/use-client-context";

// Interface for our opportunity matches WITH joined data from opportunities and survivors
interface OpportunityMatchWithDetails {
  id: number;
  opportunityId: number;
  survivorId: number;
  status: string;
  matchScore: string;
  matchCriteria: any;
  notes: string | null;
  awardAmount: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastCheckedAt: Date;
  
  // Application tracking fields
  appliedAt?: Date | null;
  appliedById?: number | null;
  awardedAt?: Date | null;
  awardedById?: number | null;
  fundedAt?: Date | null;
  fundedById?: number | null;
  
  // Additional properties from joined tables
  opportunityName: string;
  survivorName: string;
  applicationEndDate: Date | null;
}

interface OpportunityMatchTableProps {
  matches: OpportunityMatchWithDetails[];
  isSurvivorView?: boolean;
  onRefresh?: () => void;
}

export default function EnhancedOpportunityMatchTable({
  matches,
  isSurvivorView = false,
  onRefresh
}: OpportunityMatchTableProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedClient, setSelectedClient } = useClientContext();
  const [selectedMatch, setSelectedMatch] = useState<OpportunityMatchWithDetails | null>(null);
  const [updateNotes, setUpdateNotes] = useState<string>("");
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [isAwardDialogOpen, setIsAwardDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  
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
  
  // Update the status of a match
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      opportunityId,
      survivorId,
      status,
      notes = null,
    }: {
      opportunityId: number;
      survivorId: number;
      status: string;
      notes?: string | null;
    }) => {
      const data = {
        status,
        ...(notes !== null && { notes }),
      };
      
      const res = await apiRequest(
        "PATCH", 
        `/api/matching/matches/${opportunityId}/${survivorId}`,
        data
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Match updated",
        description: "The match status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matching/matches"] });
      setIsNotesDialogOpen(false);
      if (onRefresh) onRefresh();
    },
    onError: (error) => {
      toast({
        title: "Error updating match",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to apply for a grant
  const applyMutation = useMutation({
    mutationFn: async (match: OpportunityMatchWithDetails) => {
      if (!match) {
        throw new Error("No match selected");
      }
      
      const res = await apiRequest(
        "POST", 
        `/api/matching/apply/${match.opportunityId}/survivors/${match.survivorId}`, 
        {}
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grant application submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matching/matches"] });
      setIsApplyDialogOpen(false);
      if (onRefresh) onRefresh();
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

  // Mutation to award a grant
  const awardMutation = useMutation({
    mutationFn: async (data: { match: OpportunityMatchWithDetails, formData: any }) => {
      if (!data.match) {
        throw new Error("No match selected");
      }
      
      const res = await apiRequest(
        "POST", 
        `/api/matching/award/${data.match.opportunityId}/survivors/${data.match.survivorId}`, 
        data.formData
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grant awarded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matching/matches"] });
      // Also invalidate capital sources to show the new grant in capital stack
      queryClient.invalidateQueries({ queryKey: ["/api/capital-sources"] });
      setIsAwardDialogOpen(false);
      awardGrantForm.reset();
      if (onRefresh) onRefresh();
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
    mutationFn: async (match: OpportunityMatchWithDetails) => {
      if (!match) {
        throw new Error("No match selected");
      }
      
      const res = await apiRequest(
        "POST", 
        `/api/matching/fund/${match.opportunityId}/survivors/${match.survivorId}`, 
        {}
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grant marked as funded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matching/matches"] });
      // Also invalidate capital sources to update the grant status in capital stack
      queryClient.invalidateQueries({ queryKey: ["/api/capital-sources"] });
      if (onRefresh) onRefresh();
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
  
  // Format the date for display
  const formatDate = (date: Date | string | null) => {
    if (!date) return "No deadline";
    return new Date(date).toLocaleDateString();
  };
  
  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>;
      case "notified":
        return <Badge variant="secondary">Notified</Badge>;
      case "applied":
        return <Badge variant="default">Applied</Badge>;
      case "awarded":
        return <Badge variant="success"><Award className="mr-1 h-3 w-3" /> Awarded</Badge>;
      case "funded":
        return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" /> Funded</Badge>;
      case "approved": // Legacy status
        return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Rejected</Badge>;
      case "archived":
        return <Badge variant="outline"><Archive className="mr-1 h-3 w-3" /> Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Open the notes dialog
  const openNotesDialog = (match: OpportunityMatchWithDetails) => {
    setSelectedMatch(match);
    setUpdateNotes(match.notes || "");
    setIsNotesDialogOpen(true);
  };
  
  // Open the details dialog
  const openDetailsDialog = (match: OpportunityMatchWithDetails) => {
    setSelectedMatch(match);
    setIsViewDetailsDialogOpen(true);
  };
  
  // Open Apply dialog
  const openApplyDialog = (match: OpportunityMatchWithDetails) => {
    setSelectedMatch(match);
    setIsApplyDialogOpen(true);
  };

  // Open Award dialog
  const openAwardDialog = (match: OpportunityMatchWithDetails) => {
    setSelectedMatch(match);
    // Pre-fill the award amount if available from the opportunity
    if (match.awardAmount) {
      awardGrantForm.setValue('awardAmount', parseFloat(match.awardAmount));
    }
    setIsAwardDialogOpen(true);
  };

  // Open Archive dialog
  const openArchiveDialog = (match: OpportunityMatchWithDetails) => {
    setSelectedMatch(match);
    setArchiveDialogOpen(true);
  };
  
  // Trigger fund mutation
  const handleFundGrant = (match: OpportunityMatchWithDetails) => {
    if (confirm("Are you sure you want to mark this grant as funded? This will update the client's capital stack.")) {
      fundMutation.mutate(match);
    }
  };
  
  // Update the match status for archive
  const handleArchiveMatch = () => {
    if (!selectedMatch) return;
    
    updateStatusMutation.mutate({
      opportunityId: selectedMatch.opportunityId,
      survivorId: selectedMatch.survivorId,
      status: "archived",
      notes: updateNotes,
    });
    
    setArchiveDialogOpen(false);
  };
  
  // Handle apply for grant
  const handleApplyForGrant = () => {
    if (!selectedMatch) return;
    applyMutation.mutate(selectedMatch);
  };

  // Handle award grant submission
  const handleAwardGrantSubmit = (formData: any) => {
    if (!selectedMatch) return;
    awardMutation.mutate({
      match: selectedMatch,
      formData
    });
  };
  
  // Handle view as client for a specific match
  const handleViewAsClient = (survivorId: number) => {
    // Find the client based on survivorId from the match
    const match = matches.find(m => m.survivorId === survivorId);
    if (match) {
      // Find the actual client in the client context, or create a placeholder
      const clientToSelect = {
        id: survivorId,
        username: `client-${survivorId}`,
        name: match.survivorName,
        role: "user",
        email: "",
        password: "", // This is not used, just to satisfy type checking
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setSelectedClient(clientToSelect);
      toast({
        title: "Viewing as client",
        description: `Now viewing as ${match.survivorName}`,
      });
    }
  };
  
  // Check if user has admin privileges
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              {isSurvivorView ? "Funding Opportunity" : "Client"}
            </TableHead>
            <TableHead>{isSurvivorView ? "Amount" : "Opportunity"}</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="hidden md:table-cell">Last Updated</TableHead>
            <TableHead className="hidden md:table-cell">Amount</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No matches found.
              </TableCell>
            </TableRow>
          ) : (
            matches.map((match) => (
              <TableRow key={`${match.opportunityId}-${match.survivorId}`} className={match.status === 'archived' ? 'opacity-60' : ''}>
                <TableCell className="font-medium">
                  {isSurvivorView ? match.opportunityName : match.survivorName}
                </TableCell>
                <TableCell>
                  {isSurvivorView ? (
                    formatCurrency(match.awardAmount ? parseFloat(match.awardAmount) : null)
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span 
                            className="block max-w-[200px] truncate cursor-help"
                            onClick={() => openDetailsDialog(match)}
                          >
                            {match.opportunityName}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{match.opportunityName}</p>
                          <p className="text-xs text-muted-foreground">
                            Click to view details
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {getStatusBadge(match.status)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {match.updatedAt ? formatDate(match.updatedAt) : formatDate(match.createdAt)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {match.awardAmount ? formatCurrency(parseFloat(match.awardAmount)) : formatCurrency(null)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {/* Action buttons based on status */}
                    {match.status === "pending" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openApplyDialog(match)}
                      >
                        <CreditCard className="h-4 w-4 mr-1" /> Apply
                      </Button>
                    )}
                    
                    {match.status === "applied" && isAdmin && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openAwardDialog(match)}
                      >
                        <Award className="h-4 w-4 mr-1" /> Award
                      </Button>
                    )}
                    
                    {match.status === "awarded" && isAdmin && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleFundGrant(match)}
                      >
                        <FileCheck className="h-4 w-4 mr-1" /> Fund
                      </Button>
                    )}
                    
                    {/* View as client option */}
                    {!isSurvivorView && !selectedClient && isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewAsClient(match.survivorId)}
                        title="View as this client"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* More options dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetailsDialog(match)}>
                          View match details
                        </DropdownMenuItem>
                        
                        {!isSurvivorView && (
                          <>
                            <DropdownMenuItem onClick={() => openNotesDialog(match)}>
                              Add/Edit notes
                            </DropdownMenuItem>
                            
                            {match.status !== "archived" && (
                              <DropdownMenuItem 
                                onClick={() => openArchiveDialog(match)}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive match
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {/* Notes Dialog */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Match Notes</DialogTitle>
            <DialogDescription>
              {selectedMatch && (
                <span>
                  Add or edit notes for the match between{" "}
                  <strong>{selectedMatch.survivorName}</strong> and{" "}
                  <strong>{selectedMatch.opportunityName}</strong>.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">Notes</h4>
              <Textarea
                placeholder="Add notes about this match..."
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNotesDialogOpen(false)}
            >
              Cancel
            </Button>
            
            <Button 
              onClick={() => {
                if (!selectedMatch) return;
                updateStatusMutation.mutate({
                  opportunityId: selectedMatch.opportunityId,
                  survivorId: selectedMatch.survivorId,
                  status: selectedMatch.status, // Keep same status, just update notes
                  notes: updateNotes,
                });
              }}
              disabled={updateStatusMutation.isPending}
            >
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Apply for Grant Dialog */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for Grant</DialogTitle>
            <DialogDescription>
              {selectedMatch && (
                <span>
                  You are applying for this grant on behalf of {selectedMatch.survivorName}.
                  The client will receive an email confirmation.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-medium mb-2">Grant Details</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Opportunity:</span>
                  <span className="font-medium">{selectedMatch?.opportunityName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Potential Amount:</span>
                  <span className="font-medium">
                    {selectedMatch?.awardAmount 
                      ? formatCurrency(parseFloat(selectedMatch?.awardAmount)) 
                      : "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Application Deadline:</span>
                  <span className="font-medium">
                    {formatDate(selectedMatch?.applicationEndDate)}
                  </span>
                </div>
              </div>
            </div>
            <p>Are you sure you want to submit this grant application?</p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApplyDialogOpen(false)}
            >
              Cancel
            </Button>
            
            <Button 
              onClick={handleApplyForGrant}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Award Grant Dialog */}
      <Dialog open={isAwardDialogOpen} onOpenChange={setIsAwardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award Grant</DialogTitle>
            <DialogDescription>
              {selectedMatch && (
                <span>
                  You are awarding this grant to {selectedMatch.survivorName}.
                  The client will receive an email notification.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...awardGrantForm}>
            <form onSubmit={awardGrantForm.handleSubmit(handleAwardGrantSubmit)} className="space-y-4 py-4">
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
                      <Textarea placeholder="Add any notes about this award" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setIsAwardDialogOpen(false)}>
                  Cancel
                </Button>
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
      
      {/* Archive Dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Match</DialogTitle>
            <DialogDescription>
              {selectedMatch && (
                <span>
                  Are you sure you want to archive the match between{" "}
                  <strong>{selectedMatch.survivorName}</strong> and{" "}
                  <strong>{selectedMatch.opportunityName}</strong>?
                  Archived matches will be hidden from active lists but data will be preserved.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">Archive Notes (Optional)</h4>
              <Textarea
                placeholder="Add a note about why this match is being archived..."
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArchiveDialogOpen(false)}
            >
              Cancel
            </Button>
            
            <Button 
              variant="destructive"
              onClick={handleArchiveMatch}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archive Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Details Dialog */}
      <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Match Details</DialogTitle>
            <DialogDescription>
              Detailed information about this funding opportunity match.
            </DialogDescription>
          </DialogHeader>
          
          {selectedMatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Client</h4>
                  <p className="font-medium">{selectedMatch.survivorName}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Opportunity</h4>
                  <p className="font-medium">{selectedMatch.opportunityName}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Award Amount</h4>
                  <p className="font-medium">{selectedMatch.awardAmount ? formatCurrency(parseFloat(selectedMatch.awardAmount)) : "Not awarded yet"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Match Score</h4>
                  <p className="font-medium">{selectedMatch.matchScore}%</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                  <div>{getStatusBadge(selectedMatch.status)}</div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Application Deadline</h4>
                  <p className="font-medium">{formatDate(selectedMatch.applicationEndDate)}</p>
                </div>
                
                {/* Application Timeline */}
                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium mb-3">Application Timeline</h4>
                  <div className="space-y-3">
                    {selectedMatch.appliedAt && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2 text-primary" />
                          <span>Applied</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(selectedMatch.appliedAt)}
                        </div>
                      </div>
                    )}
                    
                    {selectedMatch.awardedAt && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Award className="h-4 w-4 mr-2 text-primary" />
                          <span>Awarded</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(selectedMatch.awardedAt)}
                        </div>
                      </div>
                    )}
                    
                    {selectedMatch.fundedAt && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileCheck className="h-4 w-4 mr-2 text-primary" />
                          <span>Funded</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(selectedMatch.fundedAt)}
                        </div>
                      </div>
                    )}
                    
                    {!selectedMatch.appliedAt && !selectedMatch.awardedAt && !selectedMatch.fundedAt && (
                      <div className="text-sm text-muted-foreground italic">
                        No application activity recorded yet
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Match Criteria</h4>
                  <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                    {selectedMatch.matchCriteria && Object.entries(selectedMatch.matchCriteria).map(([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <div className="flex justify-between items-center">
                          <span className="capitalize font-medium">{key.replace(/([A-Z])/g, ' $1')}</span>
                          {typeof value === 'object' && value !== null ? (
                            <Badge variant={value.matches ? "success" : "outline"}>
                              {value.matches ? "Match" : "No Match"}
                            </Badge>
                          ) : (
                            <span className="font-medium">
                              {value === true ? "Yes" : 
                               value === false ? "No" : 
                               value === null ? "N/A" : 
                               String(value)}
                            </span>
                          )}
                        </div>
                        
                        {/* Display nested object properties */}
                        {typeof value === 'object' && value !== null && (
                          <div className="mt-1 ml-4 text-xs text-muted-foreground">
                            {Object.entries(value).filter(([k]) => k !== 'matches').map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                <span>{v === null ? "N/A" : String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedMatch.notes && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Notes</h4>
                    <p className="text-sm">{selectedMatch.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}