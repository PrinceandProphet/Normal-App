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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ArrowRight } from "lucide-react";
import type { User, CaseManagement } from "@shared/schema";

export default function SurvivorsManagement() {
  const { toast } = useToast();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  // Fetch survivors managed by this case manager
  const { data: survivors = [] } = useQuery<(User & { caseManagement: CaseManagement })[]>({
    queryKey: ["/api/case-manager/survivors"],
  });

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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setTransferDialogOpen(true)}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Transfer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
    </div>
  );
}
