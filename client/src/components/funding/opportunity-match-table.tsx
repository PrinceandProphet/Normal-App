import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OpportunityMatch } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

// Extended interface to include additional data from our database query
interface OpportunityMatchWithDetails extends OpportunityMatch {
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
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const updateStatusMutation = useMutation({
    mutationFn: async ({ opportunityId, survivorId, status }: { opportunityId: number; survivorId: number; status: string }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/matching/opportunities/${opportunityId}/survivors/${survivorId}/match`,
        { status }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matching"] });
      toast({
        title: "Status updated",
        description: "Match status was successfully updated",
      });
      setEditingId(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to update status",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return "secondary";
      case 'notified':
        return "outline";
      case 'applied':
        return "default";
      case 'approved':
        return "success";
      case 'rejected':
        return "destructive";
      default:
        return "outline";
    }
  };

  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No matches found.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {!isSurvivorView && <TableHead>Client Name</TableHead>}
            <TableHead>Opportunity</TableHead>
            <TableHead>Award Amount</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => {
            const matchKey = `${match.opportunityId}-${match.survivorId}`;
            const isEditing = editingId === matchKey;
            
            return (
              <TableRow key={matchKey}>
                {!isSurvivorView && (
                  <TableCell className="font-medium">{match.survivorName}</TableCell>
                )}
                <TableCell>{match.opportunityName}</TableCell>
                <TableCell>{formatCurrency(match.awardAmount)}</TableCell>
                <TableCell>
                  {match.applicationEndDate 
                    ? new Date(match.applicationEndDate).toLocaleDateString() 
                    : "No deadline"}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Select
                      defaultValue={match.status}
                      onValueChange={(value) => {
                        updateStatusMutation.mutate({
                          opportunityId: match.opportunityId,
                          survivorId: match.survivorId,
                          status: value,
                        });
                      }}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="notified">Notified</SelectItem>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={getStatusBadgeVariant(match.status)}>
                      {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setEditingId(null)}
                      disabled={updateStatusMutation.isPending}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(matchKey)}
                    >
                      Change Status
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}