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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { User, CaseManagement, Organization } from "@shared/schema";
import { insertUserSchema, insertHouseholdMemberSchema } from "@shared/schema";

// Type for survivor with case management data
type SurvivorWithCase = User & { 
  caseManagement?: CaseManagement 
};

export default function SurvivorsManagement() {
  const { toast } = useToast();
  const [addSurvivorDialogOpen, setAddSurvivorDialogOpen] = useState(false);

  // Form setup for new survivor with extended fields
  const form = useForm({
    resolver: zodResolver(insertHouseholdMemberSchema.extend({
      email: insertUserSchema.shape.email,
      role: insertUserSchema.shape.role,
    })),
    defaultValues: {
      name: "",
      email: "",
      role: "survivor" as const,
      type: "adult" as const,
      dateOfBirth: "",
      employer: "",
      occupation: "",
      employmentStatus: undefined,
      annualIncome: undefined,
      educationLevel: undefined,
      primaryLanguage: "",
      isVeteran: false,
      hasDisabilities: false,
      disabilityNotes: "",
      isStudentFullTime: false,
      isSenior: false,
      qualifyingTags: [],
    },
  });

  // Fetch survivors managed by this case manager
  const { data: survivors = [], isLoading: isLoadingSurvivors } = useQuery<SurvivorWithCase[]>({
    queryKey: ["/api/survivors"],
    onSuccess: (data) => {
      console.log("Survivors data:", data);
    },
  });

  // Fetch funding opportunities
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const onSubmit = async (data: any) => {
    try {
      // Create the user
      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          role: "survivor",
        }),
      });

      if (!userResponse.ok) {
        throw new Error("Failed to create user");
      }

      const newUser = await userResponse.json();

      // Create case management entry
      const caseResponse = await fetch('/api/case-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          survivorId: newUser.id,
          organizationId: organizations[0]?.id,
          status: "active",
          startDate: new Date().toISOString(),
        }),
      });

      if (!caseResponse.ok) {
        throw new Error("Failed to create case management entry");
      }

      // Create household member entry
      const memberResponse = await fetch('/api/household-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          dateOfBirth: data.dateOfBirth,
          employer: data.employer,
          occupation: data.occupation,
          employmentStatus: data.employmentStatus,
          annualIncome: data.annualIncome,
          educationLevel: data.educationLevel,
          primaryLanguage: data.primaryLanguage,
          isVeteran: data.isVeteran,
          hasDisabilities: data.hasDisabilities,
          disabilityNotes: data.disabilityNotes,
          isStudentFullTime: data.isStudentFullTime,
          isSenior: data.isSenior,
          qualifyingTags: data.qualifyingTags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!memberResponse.ok) {
        throw new Error("Failed to create household member");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/survivors"] });
      setAddSurvivorDialogOpen(false);
      form.reset();

      toast({
        title: "Success",
        description: "New survivor added successfully",
      });
    } catch (error) {
      console.error("Error adding survivor:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add survivor",
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Survivor</DialogTitle>
            <DialogDescription>
              Enter the survivor's information to create a new case.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primaryLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Language</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Employment Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Employment Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employer</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="occupation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Occupation</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="employmentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employment Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="full_time">Full Time</SelectItem>
                            <SelectItem value="part_time">Part Time</SelectItem>
                            <SelectItem value="self_employed">Self Employed</SelectItem>
                            <SelectItem value="unemployed">Unemployed</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="annualIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Income</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Status Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Additional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isVeteran"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Veteran Status</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasDisabilities"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Has Disabilities</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isStudentFullTime"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Full-time Student</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

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