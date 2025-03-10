import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowRight } from "lucide-react";
import type { User, CaseManagement, Organization } from "@shared/schema";

export default function SurvivorsManagement() {
  const { toast } = useToast();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedSurvivor, setSelectedSurvivor] = useState<User | null>(null);
  const [targetOrganizationId, setTargetOrganizationId] = useState<number | null>(null);

  // Fetch survivors managed by this case manager
  const { data: survivors = [], isLoading: isLoadingSurvivors } = useQuery<(User & { caseManagement: CaseManagement })[]>({
    queryKey: ["/api/case-manager/survivors"],
  });

  // Fetch organizations for transfer
  const { data: organizations = [], isLoading: isLoadingOrgs } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const handleTransferClick = (survivor: User & { caseManagement: CaseManagement }) => {
    setSelectedSurvivor(survivor);
    setTransferDialogOpen(true);
  };

  const handleTransfer = async () => {
    if (!selectedSurvivor || !targetOrganizationId) return;

    try {
      await apiRequest("PATCH", `/api/case-management/${selectedSurvivor.caseManagement.id}`, {
        status: "transferred",
        organizationId: targetOrganizationId,
        endDate: new Date().toISOString(),
      });

      // Create new case management entry for target organization
      await apiRequest("POST", "/api/case-management", {
        survivorId: selectedSurvivor.id,
        organizationId: targetOrganizationId,
        status: "active",
        startDate: new Date().toISOString(),
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/case-manager/survivors"] });

      setTransferDialogOpen(false);
      setSelectedSurvivor(null);
      setTargetOrganizationId(null);

      toast({
        title: "Success",
        description: "Survivor transferred successfully",
      });
    } catch (error) {
      console.error("Failed to transfer survivor:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to transfer survivor",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Survivors Management</h1>
          <p className="text-muted-foreground">
            Manage and support survivors through their recovery journey
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Survivor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSurvivors ? (
            <div className="text-center py-8">Loading survivors...</div>
          ) : survivors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active survivors found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Case Start Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {survivors.map((survivor) => (
                  <TableRow key={survivor.id}>
                    <TableCell className="font-medium">{survivor.name}</TableCell>
                    <TableCell>{survivor.caseManagement.status}</TableCell>
                    <TableCell>
                      {new Date(survivor.caseManagement.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                        {organizations.length > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleTransferClick(survivor)}
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Transfer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {survivors.filter(s => s.caseManagement.status === 'active').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transferred Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {survivors.filter(s => s.caseManagement.status === 'transferred').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Closed Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {survivors.filter(s => s.caseManagement.status === 'closed').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Survivor</DialogTitle>
            <DialogDescription>
              Select an organization to transfer this survivor to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLoadingOrgs ? (
              <div>Loading organizations...</div>
            ) : (
              <Select
                onValueChange={(value) => setTargetOrganizationId(Number(value))}
                value={targetOrganizationId?.toString()}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name} ({org.type === "non_profit" ? "Non-Profit" : "For-Profit"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransfer}
              disabled={!targetOrganizationId || isLoadingOrgs}
            >
              Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}