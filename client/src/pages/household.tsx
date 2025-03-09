import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Building2, Home, Users, Trash2, Pencil, X } from "lucide-react";
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

      // Invalidate queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/household-groups"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/household-members"] });

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

  // Form setup for member
  const memberForm = useForm({
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
      isSenior: false,
      isPregnant: false,
      qualifyingTags: [],
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
                                          <FormField
                                            control={memberForm.control}
                                            name="relationship"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Relationship</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                        </div>
                                      </div>

                                      {/* Sensitive Information Section */}
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                          <h3 className="font-semibold">Sensitive Information</h3>
                                          <p className="text-sm text-muted-foreground">
                                            (This information is encrypted and stored securely)
                                          </p>
                                        </div>
                                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                          <FormField
                                            control={memberForm.control}
                                            name="ssn"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Social Security Number</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    {...field}
                                                    type="password"
                                                    placeholder="XXX-XX-XXXX"
                                                    autoComplete="off"
                                                  />
                                                </FormControl>
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
                                                    onChange={(e) => field.onChange(e.target.value)}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      </div>

                                      {/* Demographics Section */}
                                      <div className="space-y-4">
                                        <h3 className="font-semibold">Demographics</h3>
                                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                          <FormField
                                            control={memberForm.control}
                                            name="maritalStatus"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Marital Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                  <FormControl>
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent>
                                                    <SelectItem value="single">Single</SelectItem>
                                                    <SelectItem value="married">Married</SelectItem>
                                                    <SelectItem value="divorced">Divorced</SelectItem>
                                                    <SelectItem value="widowed">Widowed</SelectItem>
                                                    <SelectItem value="separated">Separated</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={memberForm.control}
                                            name="educationLevel"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Education Level</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                  <FormControl>
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select education level" />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent>
                                                    <SelectItem value="less_than_high_school">Less than High School</SelectItem>
                                                    <SelectItem value="high_school">High School</SelectItem>
                                                    <SelectItem value="some_college">Some College</SelectItem>
                                                    <SelectItem value="associates">Associate's Degree</SelectItem>
                                                    <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                                                    <SelectItem value="masters">Master's Degree</SelectItem>
                                                    <SelectItem value="doctorate">Doctorate</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={memberForm.control}
                                            name="primaryLanguage"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Primary Language</FormLabel>
                                                <FormControl>
                                                  <Input {...field} placeholder="Primary language spoken" />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      </div>

                                      {/* Employment Information Section */}
                                      <div className="space-y-4">
                                        <h3 className="font-semibold">Employment Information</h3>
                                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                          <FormField
                                            control={memberForm.control}
                                            name="employer"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Employer</FormLabel>
                                                <FormControl>
                                                  <Input {...field} placeholder="Current employer" />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={memberForm.control}
                                            name="occupation"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Occupation</FormLabel>
                                                <FormControl>
                                                  <Input {...field} placeholder="Current occupation" />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={memberForm.control}
                                            name="employmentStatus"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Employment Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                            control={memberForm.control}
                                            name="annualIncome"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Annual Income</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    {...field}
                                                    type="number"
                                                    placeholder="0.00"
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          {/* Add Student Status Fields */}
                                          <FormField
                                            control={memberForm.control}
                                            name="isStudentFullTime"
                                            render={({ field }) => (
                                              <FormItem className="flex items-center gap-2">
                                                <FormControl>
                                                  <input
                                                    type="checkbox"
                                                    checked={field.value}
                                                    onChange={field.onChange}
                                                    className="h-4 w-4"
                                                  />
                                                </FormControl>
                                                <FormLabel className="!mt-0">Full-time Student</FormLabel>
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={memberForm.control}
                                            name="institution"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Educational Institution</FormLabel>
                                                <FormControl>
                                                  <Input {...field} placeholder="Name of school/university" />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      </div>

                                      {/* Grant Qualification Section */}
                                      <div className="space-y-4">
                                        <h3 className="font-semibold">Grant Qualification Information</h3>
                                        <div className="grid gap-4 grid-cols-1">
                                          <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                              control={memberForm.control}
                                              name="isVeteran"
                                              render={({ field }) => (
                                                <FormItem className="flex items-center gap-2">
                                                  <FormControl>
                                                    <input
                                                      type="checkbox"
                                                      checked={field.value}
                                                      onChange={field.onChange}
                                                      className="h-4 w-4"
                                                    />
                                                  </FormControl>
                                                  <FormLabel className="!mt-0">Veteran Status</FormLabel>
                                                </FormItem>
                                              )}
                                            />
                                            <FormField
                                              control={memberForm.control}
                                              name="hasDisabilities"
                                              render={({ field }) => (
                                                <FormItem className="flex items-center gap-2">
                                                  <FormControl>
                                                    <input
                                                      type="checkbox"
                                                      checked={field.value}
                                                      onChange={field.onChange}
                                                      className="h-4 w-4"
                                                    />
                                                  </FormControl>
                                                  <FormLabel className="!mt-0">Has Disabilities</FormLabel>
                                                </FormItem>
                                              )}
                                            />
                                          </div>
                                          <FormField
                                            control={memberForm.control}
                                            name="disabilityNotes"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Disability Notes</FormLabel>
                                                <FormControl>
                                                  <Input {...field} placeholder="Additional disability information" />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />

                                          {/* Add Eligibility Tags Field */}
                                          <FormField
                                            control={memberForm.control}
                                            name="qualifyingTags"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Additional Eligibility Criteria</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    placeholder="Type criteria and press Enter to add"
                                                    onKeyDown={(e) => {
                                                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                                        e.preventDefault();
                                                        const newTag = e.currentTarget.value.trim();
                                                        const currentTags = field.value || [];
                                                        if (!currentTags.includes(newTag)) {
                                                          field.onChange([...currentTags, newTag]);
                                                        }
                                                        e.currentTarget.value = '';
                                                      }
                                                    }}
                                                  />
                                                </FormControl>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                  {(field.value || []).map((tag, index) => (
                                                    <div
                                                      key={index}
                                                      className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm"
                                                    >
                                                      {tag}
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const newTags = field.value?.filter((_, i) => i !== index) || [];
                                                          field.onChange(newTags);
                                                        }}
                                                        className="hover:text-destructive"
                                                      >
                                                        ×
                                                      </button>
                                                    </div>
                                                  ))}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                  Add custom eligibility criteria (e.g., "First-time homebuyer", "Low-income", "Foster parent")
                                                </p>
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