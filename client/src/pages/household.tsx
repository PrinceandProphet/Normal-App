import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Building2, Trash2 } from "lucide-react";
import type { HouseholdMember } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormItem,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHouseholdMemberSchema } from "@shared/schema";

export default function Household() {
  const { toast } = useToast();
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  // Add console log to track query updates
  const { data: householdMembers = [], isLoading, refetch } = useQuery<HouseholdMember[]>({
    queryKey: ["/api/household-members"],
    onSuccess: (data) => {
      console.log("Household members fetched:", data);
    },
  });

  const form = useForm({
    resolver: zodResolver(insertHouseholdMemberSchema),
    defaultValues: {
      name: "",
      type: "adult",
    },
  });

  const addHouseholdMember = async (values: any) => {
    try {
      const response = await apiRequest("POST", "/api/household-members", values);
      console.log("Member added:", response);

      // Force a refetch of the household members
      await queryClient.invalidateQueries({ queryKey: ["/api/household-members"] });
      await refetch(); // Explicitly refetch after adding

      setAddMemberOpen(false);
      form.reset();

      toast({
        title: "Success",
        description: "Household member added successfully",
      });
    } catch (error) {
      console.error("Failed to add household member:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add household member",
      });
    }
  };

  const deleteMember = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/household-members/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/household-members"] });
      await refetch(); // Explicitly refetch after deleting

      toast({
        title: "Success",
        description: "Member removed successfully",
      });
    } catch (error) {
      console.error("Failed to delete member:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove member",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Household & Properties</h1>
          <p className="text-muted-foreground">
            Manage your household members and property information in one place.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Household Members Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Household Members</CardTitle>
            <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Household Member</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(addHouseholdMember)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter full name" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="adult">Adult</SelectItem>
                              <SelectItem value="child">Child</SelectItem>
                              <SelectItem value="pet">Pet</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <Button type="submit">Add Member</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <p>Loading household members...</p>
              ) : householdMembers?.length > 0 ? (
                <div className="space-y-4">
                  {householdMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {member.type}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMember(member.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No household members added yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Properties Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Properties</CardTitle>
            <Button variant="outline" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Property management coming soon
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Coming soon: Add and manage multiple properties, including primary residence
                and other owned/rented properties.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}