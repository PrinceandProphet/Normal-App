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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { User, CaseManagement, Organization } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";

// Type for survivor with case management data
type SurvivorWithCase = User & { 
  caseManagement?: CaseManagement 
};

export default function SurvivorsManagement() {
  const { toast } = useToast();
  const [addSurvivorDialogOpen, setAddSurvivorDialogOpen] = useState(false);

  // Form setup for new survivor
  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "survivor" as const,
    },
  });

  // Fetch survivors managed by this case manager
  const { data: survivors = [], isLoading: isLoadingSurvivors } = useQuery<SurvivorWithCase[]>({
    queryKey: ["/api/survivors"],
  });

  // Fetch organizations
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const onSubmit = async (data: any) => {
    try {
      // Step 1: Create the user record
      const userResult = await apiRequest("POST", "/api/users", {
        name: data.name,
        email: data.email,
        role: "survivor",
      });

      // Step 2: Create case management entry
      await apiRequest("POST", "/api/case-management", {
        survivorId: userResult.id,
        organizationId: organizations[0]?.id,
        status: "active",
        startDate: new Date().toISOString(),
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/survivors"] });
      setAddSurvivorDialogOpen(false);
      form.reset();

      toast({
        title: "Success",
        description: "New survivor case created successfully",
      });
    } catch (error) {
      console.error("Error creating survivor case:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create survivor case",
      });
    }
  };

  // Filter active survivors
  const activeSurvivors = survivors.filter(s => s.role === 'survivor');

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

      {/* Active Cases Card */}
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
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Survivor Dialog */}
      <Dialog open={addSurvivorDialogOpen} onOpenChange={setAddSurvivorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Survivor</DialogTitle>
            <DialogDescription>
              Enter the survivor's basic information to create a new case.
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
    </div>
  );
}