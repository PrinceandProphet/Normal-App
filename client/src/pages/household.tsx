import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Building2, Home, Users, Trash2, Pencil } from "lucide-react";
import type { Property, HouseholdGroup, HouseholdMember } from "@shared/schema";
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
  FormMessage,
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
import { insertPropertySchema, insertHouseholdGroupSchema, insertHouseholdMemberSchema } from "@shared/schema";

export default function Household() {
  const { toast } = useToast();
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: householdGroups = [] } = useQuery<HouseholdGroup[]>({
    queryKey: ["/api/household-groups"],
  });

  const { data: householdMembers = [] } = useQuery<HouseholdMember[]>({
    queryKey: ["/api/household-members"],
  });

  // Form setup for property
  const propertyForm = useForm({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      address: "",
      type: "single_family",
      ownershipStatus: "owned",
      primaryResidence: false,
    },
  });

  // Form setup for household group
  const groupForm = useForm({
    resolver: zodResolver(insertHouseholdGroupSchema),
    defaultValues: {
      name: "",
      type: "nuclear",
      propertyId: undefined,
    },
  });

  // Form setup for household member
  const memberForm = useForm({
    resolver: zodResolver(insertHouseholdMemberSchema),
    defaultValues: {
      name: "",
      type: "adult",
      groupId: undefined,
    },
  });

  const addProperty = async (values: any) => {
    try {
      await apiRequest("POST", "/api/properties", values);
      await queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setAddPropertyOpen(false);
      propertyForm.reset();
      toast({
        title: "Success",
        description: "Property added successfully",
      });
    } catch (error) {
      console.error("Failed to add property:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add property",
      });
    }
  };

  const addGroup = async (values: any) => {
    try {
      // Ensure the propertyId is set when creating a group
      const response = await apiRequest("POST", "/api/household-groups", {
        ...values,
        propertyId: selectedPropertyId,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/household-groups"] });
      setAddGroupOpen(false);
      groupForm.reset();
      toast({
        title: "Success",
        description: "Household group added successfully",
      });
    } catch (error) {
      console.error("Failed to add household group:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add household group",
      });
    }
  };

  const addOrUpdateMember = async (values: any) => {
    try {
      const formattedValues = {
        ...values,
        name: values.name.trim(),
        type: values.type || "adult",
        groupId: selectedGroupId,
      };

      let response;
      if (editingMemberId) {
        response = await apiRequest("PATCH", `/api/household-members/${editingMemberId}`, formattedValues);
      } else {
        response = await apiRequest("POST", "/api/household-members", formattedValues);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/household-members"] });
      setAddMemberOpen(false);
      setEditingMemberId(null);
      memberForm.reset();

      toast({
        title: "Success",
        description: `Household member ${editingMemberId ? 'updated' : 'added'} successfully`,
      });
    } catch (error) {
      console.error("Failed to save household member:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save household member",
      });
    }
  };

  const deleteMember = async (memberId: number) => {
    try {
      await apiRequest("DELETE", `/api/household-members/${memberId}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/household-members"] });
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

  const handleGroupDelete = async (groupId: number) => {
    try {
      await apiRequest("DELETE", `/api/household-groups/${groupId}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/household-groups"] });
      toast({
        title: "Success",
        description: "Household group deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete household group:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete household group",
      });
    }
  };

  // Helper function to get members for a specific group
  const getMembersForGroup = (groupId: number) => {
    return householdMembers.filter(member => member.groupId === groupId);
  };

  // Helper function to get groups for a specific property
  const getGroupsForProperty = (propertyId: number) => {
    return householdGroups.filter(group => group.propertyId === propertyId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Household & Properties</h1>
          <p className="text-muted-foreground">
            Manage your properties and household arrangements
          </p>
        </div>
        <Dialog open={addPropertyOpen} onOpenChange={setAddPropertyOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Property</DialogTitle>
            </DialogHeader>
            <Form {...propertyForm}>
              <form onSubmit={propertyForm.handleSubmit(addProperty)} className="space-y-4">
                <FormField
                  control={propertyForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter property address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={propertyForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single_family">Single Family Home</SelectItem>
                          <SelectItem value="multi_family">Multi-Family Home</SelectItem>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="mobile_home">Mobile Home</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Add Property</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Properties Grid */}
      <div className="grid gap-6">
        {properties.map((property) => (
          <Card key={property.id} className={selectedPropertyId === property.id ? "border-primary" : ""}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  <Home className="h-5 w-5 inline-block mr-2" />
                  {property.address}
                </CardTitle>
                <p className="text-sm text-muted-foreground capitalize">
                  {property.type.replace("_", " ")} • {property.ownershipStatus}
                </p>
              </div>
              <Button
                variant={selectedPropertyId === property.id ? "default" : "ghost"}
                onClick={() => setSelectedPropertyId(property.id)}
              >
                {selectedPropertyId === property.id ? "Selected" : "Select"}
              </Button>
            </CardHeader>

            {selectedPropertyId === property.id && (
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Household Groups</h3>
                    <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Group
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Household Group</DialogTitle>
                        </DialogHeader>
                        <Form {...groupForm}>
                          <form onSubmit={groupForm.handleSubmit(addGroup)} className="space-y-4">
                            <FormField
                              control={groupForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Group Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter group name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={groupForm.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Group Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select group type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="nuclear">Nuclear Family</SelectItem>
                                      <SelectItem value="extended">Extended Family</SelectItem>
                                      <SelectItem value="multi_generational">Multi-Generational</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="submit">Add Group</Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid gap-4">
                    {getGroupsForProperty(property.id).map((group) => (
                      <div key={group.id} className="bg-muted rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h4 className="font-medium">{group.name}</h4>
                            <p className="text-sm text-muted-foreground capitalize">
                              {group.type.replace("_", " ")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant={selectedGroupId === group.id ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setSelectedGroupId(group.id)}
                            >
                              {selectedGroupId === group.id ? "Managing Members" : "Manage Members"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleGroupDelete(group.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {selectedGroupId === group.id && (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h3 className="text-lg font-semibold">Members</h3>
                              <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Member
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      {editingMemberId ? "Edit Member" : "Add Member"}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <Form {...memberForm}>
                                    <form onSubmit={memberForm.handleSubmit(addOrUpdateMember)} className="space-y-4">
                                      <FormField
                                        control={memberForm.control}
                                        name="name"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                              <Input {...field} placeholder="Enter name" />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={memberForm.control}
                                        name="type"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                      <Button type="submit">
                                        {editingMemberId ? "Update Member" : "Add Member"}
                                      </Button>
                                    </form>
                                  </Form>
                                </DialogContent>
                              </Dialog>
                            </div>

                            {/* Display members for the selected group */}
                            {getMembersForGroup(group.id).length > 0 ? (
                              <div className="space-y-4">
                                {getMembersForGroup(group.id).map((member) => (
                                  <div key={member.id} className="flex justify-between items-start p-4 bg-background rounded-lg border">
                                    <div>
                                      <p className="font-medium">{member.name}</p>
                                      <p className="text-sm text-muted-foreground capitalize">
                                        {member.type}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingMemberId(member.id);
                                          memberForm.reset(member);
                                          setAddMemberOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => deleteMember(member.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No members in this group yet
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}