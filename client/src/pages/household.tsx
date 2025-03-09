import { useState, useEffect } from "react";
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
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Fetch properties and related data
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: householdGroups = [] } = useQuery<HouseholdGroup[]>({
    queryKey: ["/api/household-groups", selectedPropertyId],
    enabled: !!selectedPropertyId,
  });

  const { data: householdMembers = [], isLoading, refetch } = useQuery<HouseholdMember[]>({
    queryKey: ["/api/household-members", selectedGroupId],
    enabled: !!selectedGroupId,
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
    },
  });

  // Form submission handlers
  const addProperty = async (values: any) => {
    try {
      const response = await apiRequest("POST", "/api/properties", values);
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
      let response;
      if (editingMemberId) {
        response = await apiRequest("PATCH", `/api/household-members/${editingMemberId}`, {
          ...values,
          groupId: selectedGroupId,
        });
      } else {
        response = await apiRequest("POST", "/api/household-members", {
          ...values,
          groupId: selectedGroupId,
        });
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
        description: `Failed to ${editingMemberId ? 'update' : 'add'} household member`,
      });
    }
  };

  const deleteMember = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/household-members/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/household-members"] });
      await refetch();
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

  // Function to handle fuzzy search
  const searchTags = (query: string) => {
    const normalizedQuery = query.toLowerCase();
    return availableTags.filter(tag =>
      tag.toLowerCase().includes(normalizedQuery)
    );
  };

  useEffect(() => {
    if (householdMembers) {
      const tags = new Set<string>();
      householdMembers.forEach(member => {
        member.qualifyingTags?.forEach(tag => tags.add(tag));
      });
      setAvailableTags(Array.from(tags));
    }
  }, [householdMembers]);

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
          <Card key={property.id} className={selectedPropertyId === property.id ? 'border-primary' : ''}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  <Home className="h-5 w-5 inline-block mr-2" />
                  {property.address}
                </CardTitle>
                <p className="text-sm text-muted-foreground capitalize">
                  {property.type.replace('_', ' ')} • {property.ownershipStatus}
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setSelectedPropertyId(property.id)}
              >
                {selectedPropertyId === property.id ? 'Selected' : 'Select'}
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
                                      <SelectItem value="other">Other</SelectItem>
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
                    {householdGroups.map((group) => (
                      <Card key={group.id} className="bg-muted">
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">
                              <Users className="h-4 w-4 inline-block mr-2" />
                              {group.name}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedGroupId(group.id)}
                            >
                              Manage Members
                            </Button>
                          </div>
                        </CardHeader>
                        {selectedGroupId === group.id && (
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Household Members</h3>
                                <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                                  <DialogTrigger asChild onClick={() => {
                                    memberForm.reset();
                                    setEditingMemberId(null);
                                  }}>
                                    <Button variant="outline" size="sm">
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add Member
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>
                                        {editingMemberId ? 'Edit Household Member' : 'Add Household Member'}
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
                                                      {...field}
                                                      type="date"
                                                      value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                                                      onChange={(e) => {
                                                        const date = new Date(e.target.value);
                                                        field.onChange(date);
                                                      }}
                                                    />
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

                                        {/* Grant Qualification Attributes */}
                                        <div className="space-y-4">
                                          <h3 className="font-semibold">Grant Qualification Information</h3>
                                          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
                                                  <FormMessage />
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
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
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
                                            <FormField
                                              control={memberForm.control}
                                              name="specialNeeds"
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel>Special Needs</FormLabel>
                                                  <FormControl>
                                                    <Input {...field} placeholder="Special needs or requirements" />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
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
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            <FormField
                                              control={memberForm.control}
                                              name="isSenior"
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
                                                  <FormLabel className="!mt-0">Senior Citizen</FormLabel>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            <FormField
                                              control={memberForm.control}
                                              name="isPregnant"
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
                                                  <FormLabel className="!mt-0">Pregnant</FormLabel>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            {/* Updated Tag Input Field */}
                                            <div className="space-y-4">
                                              <h3 className="font-semibold">Grant Qualification Tags</h3>
                                              <div className="grid gap-4 grid-cols-1">
                                                <FormField
                                                  control={memberForm.control}
                                                  name="qualifyingTags"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Qualifying Tags</FormLabel>
                                                      <div className="space-y-2">
                                                        {/* Display existing tags */}
                                                        <div className="flex flex-wrap gap-2">
                                                          {field.value?.map((tag, index) => (
                                                            <span
                                                              key={index}
                                                              className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1"
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
                                                            </span>
                                                          ))}
                                                        </div>

                                                        {/* Tag input */}
                                                        <div className="relative">
                                                          <FormControl>
                                                            <Input
                                                              placeholder="Type a tag and press Enter"
                                                              value={tagInput}
                                                              onChange={(e) => setTagInput(e.target.value)}
                                                              onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && tagInput.trim()) {
                                                                  e.preventDefault();
                                                                  const newTag = tagInput.trim();
                                                                  const currentTags = field.value || [];
                                                                  if (!currentTags.includes(newTag)) {
                                                                    const newTags = [...currentTags, newTag];
                                                                    field.onChange(newTags);
                                                                    // Add to available tags if it's new
                                                                    if (!availableTags.includes(newTag)) {
                                                                      setAvailableTags([...availableTags, newTag]);
                                                                    }
                                                                  }
                                                                  setTagInput("");
                                                                }
                                                              }}
                                                            />
                                                          </FormControl>

                                                          {/* Fuzzy search suggestions */}
                                                          {tagInput.trim() && (
                                                            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
                                                              {searchTags(tagInput).map((tag, index) => (
                                                                <button
                                                                  key={index}
                                                                  type="button"
                                                                  className="w-full px-3 py-2 text-left hover:bg-muted"
                                                                  onClick={() => {
                                                                    const currentTags = field.value || [];
                                                                    if (!currentTags.includes(tag)) {
                                                                      field.onChange([...currentTags, tag]);
                                                                    }
                                                                    setTagInput("");
                                                                  }}
                                                                >
                                                                  {tag}
                                                                </button>
                                                              ))}
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <p className="text-sm text-muted-foreground">
                                                        Press Enter to add a tag. Common tags: first-time homebuyer, caregiver, low-income, student
                                                      </p>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        <Button type="submit">
                                          {editingMemberId ? 'Update Member' : 'Add Member'}
                                        </Button>
                                      </form>
                                    </Form>
                                  </DialogContent>
                                </Dialog>
                              </div>

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
                                            {member.type} • {member.relationship || 'Unknown relationship'}
                                          </p>
                                          {member.qualifyingTags?.length > 0 && (
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
                                        <div className="flex gap-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              memberForm.reset(member);
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
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    No household members added yet.
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        )}
                      </Card>
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