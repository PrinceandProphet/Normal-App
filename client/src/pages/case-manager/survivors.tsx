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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, ArrowRight } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { User, CaseManagement, Organization } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";

export default function SurvivorsManagement() {
  const { toast } = useToast();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [addSurvivorDialogOpen, setAddSurvivorDialogOpen] = useState(false);
  const [selectedSurvivor, setSelectedSurvivor] = useState<User | null>(null);
  const [targetOrganizationId, setTargetOrganizationId] = useState<number | null>(null);

  // Form setup for new survivor
  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "survivor" as const,
    },
  });

  // Type for survivor with case management data
  type SurvivorWithCase = User & { caseManagement?: CaseManagement };

  // Fetch survivors managed by this case manager
  const { data: survivors = [], isLoading: isLoadingSurvivors } = useQuery<SurvivorWithCase[]>({
    queryKey: ["/api/survivors"],
    onSuccess: (data) => {
      console.log("Survivors data:", data); // Debug log
    },
  });

  // Fetch organizations for transfer
  const { data: organizations = [], isLoading: isLoadingOrgs } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const handleTransferClick = (survivor: SurvivorWithCase) => {
    if (!survivor.caseManagement) return;
    setSelectedSurvivor(survivor);
    setTransferDialogOpen(true);
  };

  const handleTransfer = async () => {
    if (!selectedSurvivor?.caseManagement || !targetOrganizationId) return;

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

      await queryClient.invalidateQueries({ queryKey: ["/api/survivors"] });

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

  const onSubmit = async (data: typeof form.getValues) => {
    try {
      // Create the user
      const user = await apiRequest("POST", "/api/users", data);

      // Create case management entry
      await apiRequest("POST", "/api/case-management", {
        survivorId: user.id,
        organizationId: organizations[0]?.id, // Use first org for now
        status: "active",
        startDate: new Date().toISOString(),
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/survivors"] });

      setAddSurvivorDialogOpen(false);
      form.reset();

      toast({
        title: "Success",
        description: "New survivor added successfully",
      });
    } catch (error) {
      console.error("Failed to add survivor:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add survivor",
      });
    }
  };

  // Filter active survivors
  const activeSurvivors = survivors.filter(s => s.role === 'survivor');
  console.log("Active survivors:", activeSurvivors); // Debug log

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Survivors Management</h1>
          <p className="text-muted-foreground">
            Manage and support survivors through their recovery journey
          </p>
        </div>
        <Button onClick={() => setAddSurvivorDialogOpen(true)}>
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
          ) : activeSurvivors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active survivors found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Case Start Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSurvivors.map((survivor) => (
                  <TableRow key={survivor.id}>
                    <TableCell className="font-medium">{survivor.name}</TableCell>
                    <TableCell>{survivor.email}</TableCell>
                    <TableCell>
                      {survivor.caseManagement?.startDate && 
                        new Date(survivor.caseManagement.startDate).toLocaleDateString()}
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
              {survivors.filter(s => s.role === 'survivor').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transferred Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {survivors.filter(s => s.caseManagement?.status === 'transferred').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Closed Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {survivors.filter(s => s.caseManagement?.status === 'closed').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Survivor Dialog */}
      <Dialog open={addSurvivorDialogOpen} onOpenChange={setAddSurvivorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Survivor</DialogTitle>
            <DialogDescription>
              Enter the survivor's information to create a new case.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setAddSurvivorDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Survivor</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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