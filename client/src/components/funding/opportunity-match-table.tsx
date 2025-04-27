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
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, MoreHorizontal, XCircle, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Interface for our opportunity matches WITH joined data from opportunities and survivors
interface OpportunityMatchWithDetails {
  id: number;
  opportunityId: number;
  survivorId: number;
  status: string;
  matchScore: string;
  matchCriteria: any;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastCheckedAt: Date;
  
  // Additional properties from joined tables
  opportunityName: string;
  survivorName: string;
  awardAmount: number | null;
  applicationEndDate: Date | null;
}

interface OpportunityMatchTableProps {
  matches: OpportunityMatchWithDetails[];
  isSurvivorView?: boolean;
}

export default function OpportunityMatchTable({
  matches,
  isSurvivorView = false,
}: OpportunityMatchTableProps) {
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<OpportunityMatchWithDetails | null>(null);
  const [updateNotes, setUpdateNotes] = useState<string>("");
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  
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
    },
    onError: (error) => {
      toast({
        title: "Error updating match",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
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
      case "approved":
        return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Open the notes dialog
  const openNotesDialog = (match: OpportunityMatchWithDetails, status: string) => {
    setSelectedMatch(match);
    setUpdateNotes(match.notes || "");
    setIsNotesDialogOpen(true);
  };
  
  // Open the details dialog
  const openDetailsDialog = (match: OpportunityMatchWithDetails) => {
    setSelectedMatch(match);
    setIsViewDetailsDialogOpen(true);
  };
  
  // Update the match status
  const updateMatchStatus = (status: string) => {
    if (!selectedMatch) return;
    
    updateStatusMutation.mutate({
      opportunityId: selectedMatch.opportunityId,
      survivorId: selectedMatch.survivorId,
      status,
      notes: updateNotes,
    });
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              {isSurvivorView ? "Funding Opportunity" : "Client"}
            </TableHead>
            <TableHead>{isSurvivorView ? "Amount" : "Opportunity"}</TableHead>
            <TableHead className="hidden md:table-cell">Match Score</TableHead>
            <TableHead className="hidden md:table-cell">Deadline</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
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
              <TableRow key={`${match.opportunityId}-${match.survivorId}`}>
                <TableCell className="font-medium">
                  {isSurvivorView ? match.opportunityName : match.survivorName}
                </TableCell>
                <TableCell>
                  {isSurvivorView ? (
                    formatCurrency(match.awardAmount)
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
                            Amount: {formatCurrency(match.awardAmount)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">{match.matchScore}%</TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDate(match.applicationEndDate)}
                </TableCell>
                <TableCell>{getStatusBadge(match.status)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDetailsDialog(match)}>
                        View match details
                      </DropdownMenuItem>
                      
                      {!isSurvivorView && (
                        <>
                          {match.status === "pending" && (
                            <DropdownMenuItem 
                              onClick={() => openNotesDialog(match, "notified")}
                            >
                              Mark as notified
                            </DropdownMenuItem>
                          )}
                          
                          {match.status === "notified" && (
                            <DropdownMenuItem 
                              onClick={() => openNotesDialog(match, "applied")}
                            >
                              Mark as applied
                            </DropdownMenuItem>
                          )}
                          
                          {match.status === "applied" && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => openNotesDialog(match, "approved")}
                              >
                                Mark as approved
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openNotesDialog(match, "rejected")}
                              >
                                Mark as rejected
                              </DropdownMenuItem>
                            </>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {/* Update Status Dialog */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Match Status</DialogTitle>
            <DialogDescription>
              {selectedMatch && (
                <span>
                  Update the status of the match between{" "}
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
                placeholder="Add any notes about this status change..."
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
            
            {selectedMatch && selectedMatch.status === "pending" && (
              <Button 
                onClick={() => updateMatchStatus("notified")}
                disabled={updateStatusMutation.isPending}
              >
                Mark as Notified
              </Button>
            )}
            
            {selectedMatch && selectedMatch.status === "notified" && (
              <Button 
                onClick={() => updateMatchStatus("applied")}
                disabled={updateStatusMutation.isPending}
              >
                Mark as Applied
              </Button>
            )}
            
            {selectedMatch && selectedMatch.status === "applied" && (
              <>
                <Button 
                  onClick={() => updateMatchStatus("rejected")}
                  variant="destructive"
                  disabled={updateStatusMutation.isPending}
                >
                  Mark as Rejected
                </Button>
                <Button 
                  onClick={() => updateMatchStatus("approved")}
                  disabled={updateStatusMutation.isPending}
                >
                  Mark as Approved
                </Button>
              </>
            )}
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
                  <p className="font-medium">{formatCurrency(selectedMatch.awardAmount)}</p>
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
                
                <div className="md:col-span-2">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Match Criteria</h4>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    {selectedMatch.matchCriteria && Object.entries(selectedMatch.matchCriteria).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-medium">
                          {value === true ? "Yes" : 
                           value === false ? "No" : 
                           value === null ? "N/A" : 
                           typeof value === 'object' ? JSON.stringify(value) : 
                           String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedMatch.notes && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Notes</h4>
                    <p className="text-sm whitespace-pre-line">{selectedMatch.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDetailsDialogOpen(false)}>
              Close
            </Button>
            {!isSurvivorView && selectedMatch && (
              <Button
                onClick={() => {
                  setIsViewDetailsDialogOpen(false);
                  openNotesDialog(selectedMatch, "notified");
                }}
                disabled={
                  selectedMatch.status !== "pending" && 
                  selectedMatch.status !== "notified" && 
                  selectedMatch.status !== "applied"
                }
              >
                Update Status
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}