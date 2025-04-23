import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Building2, Home, Users, Trash2, Pencil, X, UserCircle } from "lucide-react";
import { useClientContext } from "@/hooks/use-client-context";
import type { 
  Property, HouseholdGroup, HouseholdMember,
  InsertProperty, InsertHouseholdGroup, InsertHouseholdMember
} from "@shared/schema";
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
  const { selectedClient } = useClientContext();
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);

  // Properties query - filter by survivorId if client selected
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery<Property[]>({
    queryKey: ["/api/properties", selectedClient?.id],
    queryFn: async () => {
      const url = selectedClient 
        ? `/api/properties?survivorId=${selectedClient.id}` 
        : '/api/properties';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch properties');
      return res.json();
    },
  });

  // Household groups query - filter by survivorId if client selected
  const { data: householdGroups = [], isLoading: isLoadingGroups } = useQuery<HouseholdGroup[]>({
    queryKey: ["/api/household-groups", selectedClient?.id],
    queryFn: async () => {
      const url = selectedClient 
        ? `/api/household-groups?survivorId=${selectedClient.id}` 
        : '/api/household-groups';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch household groups');
      return res.json();
    },
  });

  // Household members query - filter by survivorId if client selected
  const { data: householdMembers = [], isLoading: isLoadingMembers } = useQuery<HouseholdMember[]>({
    queryKey: ["/api/household-members", selectedClient?.id],
    queryFn: async () => {
      const url = selectedClient 
        ? `/api/household-members?survivorId=${selectedClient.id}` 
        : '/api/household-members';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch household members');
      return res.json();
    },
  });

  // Move deleteProperty inside the component
  const deleteProperty = async (propertyId: number) => {
    try {
      // Delete all groups and members associated with this property
      const propertyGroups = householdGroups.filter(group => group.propertyId === propertyId);
      for (const group of propertyGroups) {
        await apiRequest("DELETE", `/api/household-groups/${group.id}`);
      }

      // Delete the property itself
      await apiRequest("DELETE", `/api/properties/${propertyId}`);

      // Invalidate queries to refresh the UI - include client ID in the query key if a client is selected
      await queryClient.invalidateQueries({ queryKey: ["/api/properties", selectedClient?.id] });
      await queryClient.invalidateQueries({ queryKey: ["/api/household-groups", selectedClient?.id] });
      await queryClient.invalidateQueries({ queryKey: ["/api/household-members", selectedClient?.id] });

      // Reset selections if the deleted property was selected
      if (selectedPropertyId === propertyId) {
        handlePropertyDeselect();
      }

      toast({
        title: "Success",
        description: "Property and associated data deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete property:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete property",
      });
    }
  };

  // Form setup for property
  const propertyForm = useForm<InsertProperty>({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      address: "",
      type: "single_family",
      ownershipStatus: "owned",
      primaryResidence: false,
    },
  });

  // Form setup for household group
  const groupForm = useForm<InsertHouseholdGroup>({
    resolver: zodResolver(insertHouseholdGroupSchema),
    defaultValues: {
      name: "",
      type: "nuclear",
      propertyId: undefined,
    },
  });

  // Form setup for member
  const memberForm = useForm<InsertHouseholdMember>({
    resolver: zodResolver(insertHouseholdMemberSchema),
    defaultValues: {
      name: "",
      type: "adult",
      relationship: "head",
      dateOfBirth: undefined,
      ssn: "",
      employer: "",
      occupation: "",
      employmentStatus: undefined,
      annualIncome: undefined,
      maritalStatus: undefined,
      educationLevel: undefined,
      primaryLanguage: "",
      isVeteran: false,
      hasDisabilities: false,
      disabilityNotes: "",
      specialNeeds: "",
      isStudentFullTime: false,
      institution: "",
      isSenior: false,
      isPregnant: false,
      qualifyingTags: [],
      groupId: undefined,
    },
  });

  const addProperty = async (values: InsertProperty) => {
    try {
      // If a client is selected, associate the property with them
      const propertyData = selectedClient 
        ? { ...values, survivorId: selectedClient.id }
        : values;
      
      await apiRequest("POST", "/api/properties", propertyData);
      await queryClient.invalidateQueries({ queryKey: ["/api/properties", selectedClient?.id] });
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

  const addGroup = async (values: InsertHouseholdGroup) => {
    try {
      // Ensure the propertyId is set when creating a group
      const groupData = selectedClient
        ? { ...values, propertyId: selectedPropertyId, survivorId: selectedClient.id }
        : { ...values, propertyId: selectedPropertyId };

      const response = await apiRequest("POST", "/api/household-groups", groupData);
      await queryClient.invalidateQueries({ queryKey: ["/api/household-groups", selectedClient?.id] });
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

  const addOrUpdateMember = async (values: InsertHouseholdMember) => {
    try {
      const formattedValues = selectedClient
        ? {
            ...values,
            name: values.name.trim(),
            type: values.type || "adult",
            groupId: selectedGroupId,
            survivorId: selectedClient.id
          }
        : {
            ...values,
            name: values.name.trim(),
            type: values.type || "adult",
            groupId: selectedGroupId
          };

      let response;
      if (editingMemberId) {
        response = await apiRequest("PATCH", `/api/household-members/${editingMemberId}`, formattedValues);
      } else {
        response = await apiRequest("POST", "/api/household-members", formattedValues);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/household-members", selectedClient?.id] });
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
      await queryClient.invalidateQueries({ queryKey: ["/api/household-members", selectedClient?.id] });
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
      await queryClient.invalidateQueries({ queryKey: ["/api/household-groups", selectedClient?.id] });
      await queryClient.invalidateQueries({ queryKey: ["/api/household-members", selectedClient?.id] });
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

  const getMembersForGroup = (groupId: number) => {
    return householdMembers.filter(member => member.groupId === groupId);
  };

  const getGroupsForProperty = (propertyId: number) => {
    return householdGroups.filter(group => group.propertyId === propertyId);
  };

  const handlePropertyDeselect = () => {
    setSelectedPropertyId(null);
    setSelectedGroupId(null); // Also deselect group when property is deselected
  };

  const handleGroupDeselect = () => {
    setSelectedGroupId(null);
  };

  return (
    <div className="space-y-6">
      {selectedClient && (
        <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 mb-4 flex items-center">
          <UserCircle className="h-6 w-6 mr-2 text-primary" />
          <div>
            <p className="font-medium">
              Viewing household data for: <span className="text-primary">{selectedClient.firstName} {selectedClient.lastName}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              This view shows only properties and household data for the selected client.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Household & Properties</h1>
          <p className="text-muted-foreground">
            Manage your properties and household arrangements
          </p>
        </div>
        {selectedClient && (
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
        )}
      </div>

      {/* Properties Grid */}
      {!selectedClient ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No Client Selected</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                Please select a client from the client selector to view and manage their household information and properties.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {properties.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Home className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">No Properties</h3>
                  <p className="text-muted-foreground max-w-md mb-4">
                    This client doesn't have any properties yet. Add a property to get started.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            properties.map((property) => (
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
                  <div className="flex gap-2">
                    {selectedPropertyId === property.id ? (
                      <Button variant="ghost" onClick={handlePropertyDeselect}>
                        <X className="h-4 w-4 mr-2" />
                        Deselect
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedPropertyId(property.id)}
                      >
                        Select
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteProperty(property.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
                        {getGroupsForProperty(property.id).length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">
                            No household groups yet. Add one to get started.
                          </p>
                        ) : (
                          getGroupsForProperty(property.id).map((group) => (
                            <div key={group.id} className="bg-muted rounded-lg p-4">
                              <div className="flex justify-between items-center mb-4">
                                <div>
                                  <h4 className="font-medium">{group.name}</h4>
                                  <p className="text-sm text-muted-foreground capitalize">
                                    {group.type.replace("_", " ")}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  {selectedGroupId === group.id ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleGroupDeselect}
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Deselect
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedGroupId(group.id)}
                                    >
                                      Manage Members
                                    </Button>
                                  )}
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
                                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                          <DialogTitle>
                                            {editingMemberId ? "Edit Household Member" : "Add Household Member"}
                                          </DialogTitle>
                                        </DialogHeader>
                                        <Form {...memberForm}>
                                          <form onSubmit={memberForm.handleSubmit(addOrUpdateMember)} className="space-y-6">
                                            {/* Basic Information Section */}
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
                                                  name="type"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Member Type</FormLabel>
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
                                              </div>
                                            </div>
                                            <Button type="submit">Save Member</Button>
                                          </form>
                                        </Form>
                                      </DialogContent>
                                    </Dialog>
                                  </div>

                                  {getMembersForGroup(group.id).length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4">
                                      No members in this group yet
                                    </p>
                                  ) : (
                                    <div className="grid gap-2">
                                      {getMembersForGroup(group.id).map((member) => (
                                        <div
                                          key={member.id}
                                          className="flex items-center justify-between p-2 bg-background rounded border"
                                        >
                                          <div>
                                            <p className="font-medium">{member.name}</p>
                                            <p className="text-xs text-muted-foreground capitalize">
                                              {member.type} • {member.relationship}
                                            </p>
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setEditingMemberId(member.id);
                                                memberForm.reset({
                                                  ...member,
                                                });
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
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}