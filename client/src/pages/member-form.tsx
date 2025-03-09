import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { insertHouseholdMemberSchema, type HouseholdMember } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

type MemberFormProps = {
  groupId: number;
  onSuccess?: () => void;
};

export function MemberForm({ groupId, onSuccess }: MemberFormProps) {
  const { toast } = useToast();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);

  const memberForm = useForm({
    resolver: zodResolver(insertHouseholdMemberSchema),
    defaultValues: {
      name: "",
      type: "adult",
      relationship: "head",
      dateOfBirth: "",
      ssn: "",
      employer: "",
      occupation: "",
      employmentStatus: "full_time" as const,
      annualIncome: 0,
      maritalStatus: "single" as const,
      educationLevel: "high_school" as const,
      primaryLanguage: "",
      isVeteran: false,
      hasDisabilities: false,
      disabilityNotes: "",
      specialNeeds: "",
      isStudentFullTime: false,
      isSenior: false,
      isPregnant: false,
      qualifyingTags: [] as string[],
      groupId,
    },
  });

  const addOrUpdateMember = async (values: any) => {
    try {
      const formattedValues = {
        ...values,
        dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth).toISOString() : undefined,
        groupId,
        // Ensure numeric values are properly converted
        annualIncome: values.annualIncome ? Number(values.annualIncome) : undefined,
      };

      let response;
      if (editingMemberId) {
        response = await apiRequest(
          "PATCH",
          `/api/household-members/${editingMemberId}`,
          formattedValues
        );
      } else {
        response = await apiRequest(
          "POST",
          "/api/household-members",
          formattedValues
        );
      }

      // Invalidate the query for this specific group
      await queryClient.invalidateQueries({
        queryKey: ["/api/household-members", groupId],
        exact: true,
      });

      setAddMemberOpen(false);
      setEditingMemberId(null);
      memberForm.reset();

      if (onSuccess) {
        onSuccess();
      }

      toast({
        title: "Success",
        description: `Member ${editingMemberId ? 'updated' : 'added'} successfully`,
      });
    } catch (error) {
      console.error("Failed to save member:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${editingMemberId ? 'update' : 'add'} member`,
      });
    }
  };

  return (
    <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingMemberId ? "Edit Member" : "Add New Member"}
          </DialogTitle>
        </DialogHeader>
        <Form {...memberForm}>
          <form onSubmit={memberForm.handleSubmit(addOrUpdateMember)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <FormField
                  control={memberForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter full name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={memberForm.control}
                  name="relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="head">Head of Household</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="grandparent">Grandparent</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={memberForm.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button type="submit">
              {editingMemberId ? "Update Member" : "Add Member"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type MemberListProps = {
  groupId: number;
  members: HouseholdMember[];
};

export function MemberList({ groupId, members }: MemberListProps) {
  const { toast } = useToast();

  const deleteMember = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/household-members/${id}`);
      await queryClient.invalidateQueries({
        queryKey: ["/api/household-members", groupId],
        exact: true
      });
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Household Members</h3>
        <MemberForm groupId={groupId} />
      </div>

      <div className="space-y-4">
        {members.length > 0 ? (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5"
            >
              <div className="space-y-1">
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {member.type} • {member.relationship || "Unknown relationship"}
                </p>
                {member.employer && (
                  <p className="text-sm text-muted-foreground">
                    Works at {member.employer}
                  </p>
                )}
                {member.qualifyingTags && member.qualifyingTags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {member.qualifyingTags.map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    // Reset the form with the current member's data
                    memberForm.reset({
                      ...member,
                      dateOfBirth: member.dateOfBirth 
                        ? new Date(member.dateOfBirth).toISOString().split('T')[0]
                        : '',
                    });
                    setEditingMemberId(member.id);
                    setAddMemberOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMember(member.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No members in this household group yet.
          </p>
        )}
      </div>
    </div>
  );
}