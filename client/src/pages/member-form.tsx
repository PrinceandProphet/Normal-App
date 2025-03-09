import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { insertHouseholdMemberSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormLabel, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { HouseholdMember } from "@shared/schema";

type MemberFormProps = {
  groupId: number;
  onSuccess?: () => void;
  onEdit?: (member: HouseholdMember) => void;
  editingMember?: HouseholdMember | null;
  onClose?: () => void;

};

export function MemberForm({ groupId, onSuccess, onEdit, editingMember, onClose }: MemberFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertHouseholdMemberSchema),
    defaultValues: editingMember || {
      name: "",
      type: "adult" as const,
      relationship: "head" as const,
      dateOfBirth: "",
      groupId,
    },
  });

  const onSubmit = async (values: any) => {
    try {
      const formattedValues = {
        ...values,
        groupId,
        dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth).toISOString() : undefined,
      };

      if (editingMember) {
        await apiRequest("PATCH", `/api/household-members/${editingMember.id}`, formattedValues);
        if (onEdit) onEdit({...editingMember, ...formattedValues})
      } else {
        await apiRequest("POST", "/api/household-members", formattedValues);
      }

      await queryClient.invalidateQueries({
        queryKey: ["/api/household-members", groupId],
        exact: true,
      });

      setOpen(false);
      form.reset();

      if (onSuccess) {
        onSuccess();
      }

      toast({
        title: "Success",
        description: `Member ${editingMember ? 'updated' : 'added'} successfully`,
      });
      if (onClose) onClose();
    } catch (error) {
      console.error("Failed to save member:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${editingMember ? 'update' : 'add'} member`,
      });
    }
  };

  return (
    <Dialog open={open || (editingMember !== undefined)} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={()=> setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingMember ? "Edit Member" : "Add New Member"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
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
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="adult">Adult</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="dependent">Dependent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
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
              control={form.control}
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

            <Button type="submit">
              {editingMember ? "Update Member" : "Add Member"}
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
              </div>
              <div className="flex items-center gap-2">
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