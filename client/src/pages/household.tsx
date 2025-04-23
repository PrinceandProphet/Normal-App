import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Building2, Home, Users, Trash2, Pencil, X, UserCircle } from "lucide-react";
import { useClientContext } from "@/hooks/use-client-context";
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
  FormDescription,
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
  const [activeTab, setActiveTab] = useState("basic"); // For tabbed interface in member form

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
      // Basic Info
      name: "",
      type: "adult",
      relationship: "head",
      groupId: undefined,
      
      // 1. Personal Identification
      dateOfBirth: undefined,
      gender: "",
      pronouns: "",
      ssn: "",
      maritalStatus: undefined,
      primaryLanguage: "",
      race: "",
      ethnicity: "",
      citizenshipStatus: "",
      isVeteran: false,
      hasDisabilities: false,
      disabilityNotes: "",
      
      // 2. Contact Info
      phone: "",
      email: "",
      preferredContactMethod: "",
      alternateContactName: "",
      alternateContactRelationship: "",
      alternateContactPhone: "",
      
      // 3. Residency Info
      currentAddress: "",
      moveInDate: "",
      residenceType: "",
      previousAddress: "",
      lengthOfResidency: "",
      housingStatus: "",
      femaCaseNumber: "",
      
      // 4. Education & Employment
      educationLevel: undefined,
      isStudentFullTime: false,
      institution: "",
      employmentStatus: undefined,
      employer: "",
      occupation: "",
      annualIncome: undefined,
      incomeSource: "",
      
      // 5. Health & Wellness
      medicalConditions: "",
      medications: "",
      mentalHealthConditions: "",
      mobilityDevices: "",
      healthInsurance: "",
      primaryCareProvider: "",
      specialNeeds: "",
      
      // 6. Government or Institutional Involvement
      publicAssistancePrograms: [],
      caseworkerName: "",
      caseworkerAgency: "",
      justiceSystemInvolvement: false,
      childWelfareInvolvement: false,
      immigrationProceedings: false,
      
      // 7. Custom Tags (Grant-Aware Metadata)
      qualifyingTags: [],
      notes: "",
      
      // 8. Disaster-Specific Impacts
      disasterInjuries: false,
      lostMedication: false,
      postDisasterAccessNeeds: "",
      transportAccess: false,
      lostDocuments: [],
      
      // Additional flags
      isSenior: false,
      isPregnant: false,
    },
  });

  const addProperty = async (values: any) => {
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

  const addGroup = async (values: any) => {
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

  const addOrUpdateMember = async (values: any) => {
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
  
  // Helper function to insert meta tags in text fields
  const insertMetaTag = (fieldName: string, tag: string) => {
    const currentValue = memberForm.getValues(fieldName) as string || '';
    const newValue = currentValue + ` #${tag}`;
    memberForm.setValue(fieldName, newValue.trim());
    
    toast({
      title: "Meta Tag Added",
      description: `Added #${tag} to ${fieldName}`,
    });
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
                                      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                                        <DialogHeader>
                                          <DialogTitle className="text-2xl font-bold text-primary">
                                            {editingMemberId ? "Edit Household Member" : "Add Household Member"}
                                          </DialogTitle>
                                          <p className="text-muted-foreground mt-2">
                                            Fill out the member details below. Fields are organized into sections for easier navigation.
                                          </p>
                                        </DialogHeader>
                                        <div className="bg-muted/30 px-4 py-3 mb-6 rounded-md">
                                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div className="flex items-center space-x-2 text-sm">
                                              <span className="font-semibold text-primary">Current Property:</span>
                                              <span>{properties.find(p => p.id === selectedPropertyId)?.address || "None selected"}</span>
                                            </div>
                                            {editingMemberId && (
                                              <div className="flex flex-col space-y-2">
                                                <div className="text-sm font-medium mb-1">Move to different property:</div>
                                                <Select 
                                                  onValueChange={(value) => {
                                                    const propertyId = parseInt(value);
                                                    if (propertyId !== selectedPropertyId) {
                                                      // Find the first household group in the target property
                                                      const targetGroups = getGroupsForProperty(propertyId);
                                                      const targetGroupId = targetGroups.length > 0 ? targetGroups[0].id : null;
                                                      
                                                      if (targetGroupId) {
                                                        // Set this group as the new target for the member
                                                        memberForm.setValue("groupId", targetGroupId);
                                                        toast({
                                                          title: "Property Changed",
                                                          description: `Member will be moved to ${properties.find(p => p.id === propertyId)?.address}`,
                                                        });
                                                      } else {
                                                        toast({
                                                          variant: "destructive",
                                                          title: "Error",
                                                          description: "Selected property has no household groups. Please create a group first.",
                                                        });
                                                      }
                                                    }
                                                  }}
                                                  defaultValue={selectedPropertyId?.toString()}
                                                >
                                                  <SelectTrigger className="w-[280px]">
                                                    <SelectValue placeholder="Select property" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {properties.map((property) => (
                                                      <SelectItem 
                                                        key={property.id} 
                                                        value={property.id.toString()}
                                                      >
                                                        {property.address}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex space-x-2 mb-6 overflow-x-auto">
                                          {[
                                            { id: "basic", name: "Basic Info" },
                                            { id: "personal", name: "Personal ID" },
                                            { id: "contact", name: "Contact Info" },
                                            { id: "residency", name: "Residency" },
                                            { id: "education", name: "Education & Employment" },
                                            { id: "health", name: "Health & Wellness" },
                                            { id: "govt", name: "Government Assistance" },
                                            { id: "disaster", name: "Disaster Impacts" }
                                          ].map((tab) => (
                                            <Button 
                                              key={tab.id}
                                              type="button"
                                              variant={activeTab === tab.id ? "default" : "outline"}
                                              size="sm"
                                              onClick={() => setActiveTab(tab.id)}
                                              className="rounded-lg whitespace-nowrap"
                                            >
                                              {tab.name}
                                            </Button>
                                          ))}
                                        </div>
                                        
                                        <Form {...memberForm}>
                                          <form onSubmit={memberForm.handleSubmit(addOrUpdateMember)} className="space-y-8">
                                            {/* Basic Information Section */}
                                            <div className={activeTab === "basic" ? "" : "hidden"}>
                                              <h3 className="font-semibold text-lg text-primary mb-4">Basic Information</h3>
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
                                                      <FormLabel>Relationship to Head of Household</FormLabel>
                                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                          <SelectTrigger>
                                                            <SelectValue placeholder="Select relationship" />
                                                          </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                          <SelectItem value="head">Head of Household</SelectItem>
                                                          <SelectItem value="spouse">Spouse/Partner</SelectItem>
                                                          <SelectItem value="child">Child</SelectItem>
                                                          <SelectItem value="parent">Parent</SelectItem>
                                                          <SelectItem value="grandparent">Grandparent</SelectItem>
                                                          <SelectItem value="other">Other Relative/Roommate</SelectItem>
                                                        </SelectContent>
                                                      </Select>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                              </div>
                                            </div>

                                            {/* 1. Personal Identification Section */}
                                            <div className={activeTab === "personal" ? "" : "hidden"}>
                                              <h3 className="font-semibold text-lg text-primary mb-4">Personal Identification</h3>
                                              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
                                                          placeholder="YYYY-MM-DD" 
                                                        />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="ssn"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Social Security Number</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="XXX-XX-XXXX" />
                                                      </FormControl>
                                                      <FormDescription>Format: XXX-XX-XXXX</FormDescription>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="gender"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Gender</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="Enter gender" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="pronouns"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Pronouns</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="e.g. she/her, they/them" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="race"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Race</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="Enter race" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="ethnicity"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Ethnicity</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="Enter ethnicity" />
                                                      </FormControl>
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
                                                        <Input {...field} placeholder="e.g. English, Spanish" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="citizenshipStatus"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Citizenship Status</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="Enter citizenship status" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="maritalStatus"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Marital Status</FormLabel>
                                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                          <SelectTrigger>
                                                            <SelectValue placeholder="Select marital status" />
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
                                                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="isVeteran"
                                                    render={({ field }) => (
                                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                        <div className="space-y-0.5">
                                                          <FormLabel>Veteran Status</FormLabel>
                                                          <FormDescription>Is this person a veteran?</FormDescription>
                                                        </div>
                                                        <FormControl>
                                                          <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                          />
                                                        </FormControl>
                                                      </FormItem>
                                                    )}
                                                  />
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="hasDisabilities"
                                                    render={({ field }) => (
                                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                        <div className="space-y-0.5">
                                                          <FormLabel>Disability Status</FormLabel>
                                                          <FormDescription>Does this person have disabilities?</FormDescription>
                                                        </div>
                                                        <FormControl>
                                                          <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                          />
                                                        </FormControl>
                                                      </FormItem>
                                                    )}
                                                  />
                                                </div>
                                                {memberForm.watch("hasDisabilities") && (
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="disabilityNotes"
                                                    render={({ field }) => (
                                                      <FormItem className="col-span-2">
                                                        <FormLabel>Disability Notes</FormLabel>
                                                        <FormControl>
                                                          <Textarea
                                                            {...field}
                                                            placeholder="Please provide details about disabilities"
                                                          />
                                                        </FormControl>
                                                        <FormMessage />
                                                      </FormItem>
                                                    )}
                                                  />
                                                )}
                                              </div>
                                            </div>

                                            {/* 2. Contact Information Section */}
                                            <div className="space-y-4 border-t pt-4">
                                              <h3 className="font-semibold text-lg">Contact Information</h3>
                                              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                                <FormField
                                                  control={memberForm.control}
                                                  name="phone"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Phone Number</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="Enter phone number" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="email"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Email Address</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="Enter email address" type="email" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="preferredContactMethod"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Preferred Contact Method</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="e.g. Phone, Email, Text" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                              </div>
                                              
                                              <div className="pt-2">
                                                <h4 className="font-medium mb-2">Alternate Contact</h4>
                                                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="alternateContactName"
                                                    render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Alternate Contact Name</FormLabel>
                                                        <FormControl>
                                                          <Input {...field} placeholder="Enter alternate contact name" />
                                                        </FormControl>
                                                        <FormMessage />
                                                      </FormItem>
                                                    )}
                                                  />
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="alternateContactPhone"
                                                    render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Alternate Contact Phone</FormLabel>
                                                        <FormControl>
                                                          <Input {...field} placeholder="Enter alternate contact phone" />
                                                        </FormControl>
                                                        <FormMessage />
                                                      </FormItem>
                                                    )}
                                                  />
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="alternateContactRelationship"
                                                    render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Relationship to Member</FormLabel>
                                                        <FormControl>
                                                          <Input {...field} placeholder="e.g. Parent, Sibling, Friend" />
                                                        </FormControl>
                                                        <FormMessage />
                                                      </FormItem>
                                                    )}
                                                  />
                                                </div>
                                              </div>
                                            </div>

                                            {/* 3. Residency Information */}
                                            <div className="space-y-4 border-t pt-4">
                                              <h3 className="font-semibold text-lg">Residency Information</h3>
                                              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                                <FormField
                                                  control={memberForm.control}
                                                  name="currentAddress"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Current Address</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="Enter current address" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="moveInDate"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Move-in Date</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="date" 
                                                          {...field} 
                                                          placeholder="YYYY-MM-DD" 
                                                        />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="residenceType"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Residence Type</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="e.g. Apartment, House, Shelter" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="housingStatus"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Housing Status</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="e.g. Own, Rent, Temporary" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="previousAddress"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Previous Address</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="Enter previous address" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="lengthOfResidency"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Length of Residency</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="e.g. 3 years, 6 months" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="femaCaseNumber"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>FEMA Case Number</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="Enter FEMA case number if applicable" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                              </div>
                                            </div>

                                            {/* 4. Education & Employment */}
                                            <div className="space-y-4 border-t pt-4">
                                              <h3 className="font-semibold text-lg">Education & Employment</h3>
                                              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
                                                          <SelectItem value="high_school">High School Diploma/GED</SelectItem>
                                                          <SelectItem value="some_college">Some College</SelectItem>
                                                          <SelectItem value="associates">Associate's Degree</SelectItem>
                                                          <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                                                          <SelectItem value="masters">Master's Degree</SelectItem>
                                                          <SelectItem value="doctorate">Doctorate or Professional Degree</SelectItem>
                                                        </SelectContent>
                                                      </Select>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="isStudentFullTime"
                                                  render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                      <div className="space-y-0.5">
                                                        <FormLabel>Student Status</FormLabel>
                                                        <FormDescription>Is this person a full-time student?</FormDescription>
                                                      </div>
                                                      <FormControl>
                                                        <Switch
                                                          checked={field.value}
                                                          onCheckedChange={field.onChange}
                                                        />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                                {memberForm.watch("isStudentFullTime") && (
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="institution"
                                                    render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Educational Institution</FormLabel>
                                                        <FormControl>
                                                          <Input {...field} placeholder="Enter school/college name" />
                                                        </FormControl>
                                                        <FormMessage />
                                                      </FormItem>
                                                    )}
                                                  />
                                                )}
                                                <FormField
                                                  control={memberForm.control}
                                                  name="employmentStatus"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Employment Status</FormLabel>
                                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                          <SelectTrigger>
                                                            <SelectValue placeholder="Select employment status" />
                                                          </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                          <SelectItem value="full_time">Full-time</SelectItem>
                                                          <SelectItem value="part_time">Part-time</SelectItem>
                                                          <SelectItem value="self_employed">Self-employed</SelectItem>
                                                          <SelectItem value="unemployed">Unemployed</SelectItem>
                                                          <SelectItem value="retired">Retired</SelectItem>
                                                          <SelectItem value="student">Student</SelectItem>
                                                        </SelectContent>
                                                      </Select>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                {memberForm.watch("employmentStatus") && memberForm.watch("employmentStatus") !== "unemployed" && memberForm.watch("employmentStatus") !== "retired" && memberForm.watch("employmentStatus") !== "student" && (
                                                  <>
                                                    <FormField
                                                      control={memberForm.control}
                                                      name="employer"
                                                      render={({ field }) => (
                                                        <FormItem>
                                                          <FormLabel>Employer</FormLabel>
                                                          <FormControl>
                                                            <Input {...field} placeholder="Enter employer name" />
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
                                                            <Input {...field} placeholder="Enter job title/role" />
                                                          </FormControl>
                                                          <FormMessage />
                                                        </FormItem>
                                                      )}
                                                    />
                                                  </>
                                                )}
                                                <FormField
                                                  control={memberForm.control}
                                                  name="annualIncome"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Annual Income ($)</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="number" 
                                                          {...field} 
                                                          onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                                                          placeholder="Enter annual income" 
                                                        />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="incomeSource"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Income Source</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="e.g. Wages, Benefits, Retirement" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                              </div>
                                            </div>

                                            {/* 5. Health & Wellness */}
                                            <div className="space-y-4 border-t pt-4">
                                              <h3 className="font-semibold text-lg">Health & Wellness</h3>
                                              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                                <FormField
                                                  control={memberForm.control}
                                                  name="medicalConditions"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Medical Conditions</FormLabel>
                                                      <FormControl>
                                                        <Textarea {...field} placeholder="List any medical conditions" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="medications"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Medications</FormLabel>
                                                      <FormControl>
                                                        <Textarea {...field} placeholder="List any medications" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="healthInsurance"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Health Insurance</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="Enter insurance provider" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="primaryCareProvider"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Primary Care Provider</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="Doctor/clinic name" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="mobilityDevices"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Mobility Devices</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="e.g. Wheelchair, Walker, Cane" />
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
                                                        <Textarea {...field} placeholder="Describe any special needs" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="mentalHealthConditions"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Mental Health Conditions</FormLabel>
                                                      <FormControl>
                                                        <Textarea {...field} placeholder="List any mental health conditions" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <div className="flex flex-col gap-4">
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="isPregnant"
                                                    render={({ field }) => (
                                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                        <div className="space-y-0.5">
                                                          <FormLabel>Pregnancy Status</FormLabel>
                                                          <FormDescription>Is this person pregnant?</FormDescription>
                                                        </div>
                                                        <FormControl>
                                                          <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                          />
                                                        </FormControl>
                                                      </FormItem>
                                                    )}
                                                  />
                                                </div>
                                              </div>
                                            </div>

                                            {/* 6. Government or Institutional Involvement */}
                                            <div className="space-y-4 border-t pt-4">
                                              <h3 className="font-semibold text-lg">Government/Institutional Involvement</h3>
                                              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                                <FormField
                                                  control={memberForm.control}
                                                  name="caseworkerName"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Caseworker Name</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="Enter caseworker name if applicable" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={memberForm.control}
                                                  name="caseworkerAgency"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Caseworker Agency</FormLabel>
                                                      <FormControl>
                                                        <Input {...field} placeholder="Enter agency name" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="justiceSystemInvolvement"
                                                    render={({ field }) => (
                                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                        <div className="space-y-0.5">
                                                          <FormLabel>Justice System</FormLabel>
                                                          <FormDescription>Has involvement with justice system?</FormDescription>
                                                        </div>
                                                        <FormControl>
                                                          <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                          />
                                                        </FormControl>
                                                      </FormItem>
                                                    )}
                                                  />
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="childWelfareInvolvement"
                                                    render={({ field }) => (
                                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                        <div className="space-y-0.5">
                                                          <FormLabel>Child Welfare</FormLabel>
                                                          <FormDescription>Has involvement with child welfare?</FormDescription>
                                                        </div>
                                                        <FormControl>
                                                          <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                          />
                                                        </FormControl>
                                                      </FormItem>
                                                    )}
                                                  />
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="immigrationProceedings"
                                                    render={({ field }) => (
                                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                        <div className="space-y-0.5">
                                                          <FormLabel>Immigration</FormLabel>
                                                          <FormDescription>Has ongoing immigration proceedings?</FormDescription>
                                                        </div>
                                                        <FormControl>
                                                          <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                          />
                                                        </FormControl>
                                                      </FormItem>
                                                    )}
                                                  />
                                                </div>
                                              </div>
                                            </div>

                                            {/* 7. Disaster-Specific Impacts */}
                                            <div className="space-y-4 border-t pt-4">
                                              <h3 className="font-semibold text-lg">Disaster-Specific Impacts</h3>
                                              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="disasterInjuries"
                                                    render={({ field }) => (
                                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                        <div className="space-y-0.5">
                                                          <FormLabel>Disaster Injuries</FormLabel>
                                                          <FormDescription>Suffered injuries in disaster?</FormDescription>
                                                        </div>
                                                        <FormControl>
                                                          <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                          />
                                                        </FormControl>
                                                      </FormItem>
                                                    )}
                                                  />
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="lostMedication"
                                                    render={({ field }) => (
                                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                        <div className="space-y-0.5">
                                                          <FormLabel>Lost Medication</FormLabel>
                                                          <FormDescription>Lost access to medication in disaster?</FormDescription>
                                                        </div>
                                                        <FormControl>
                                                          <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                          />
                                                        </FormControl>
                                                      </FormItem>
                                                    )}
                                                  />
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="transportAccess"
                                                    render={({ field }) => (
                                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                        <div className="space-y-0.5">
                                                          <FormLabel>Transportation</FormLabel>
                                                          <FormDescription>Has reliable transportation access?</FormDescription>
                                                        </div>
                                                        <FormControl>
                                                          <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                          />
                                                        </FormControl>
                                                      </FormItem>
                                                    )}
                                                  />
                                                </div>
                                                <FormField
                                                  control={memberForm.control}
                                                  name="postDisasterAccessNeeds"
                                                  render={({ field }) => (
                                                    <FormItem className="md:col-span-2">
                                                      <FormLabel>Post-Disaster Access Needs</FormLabel>
                                                      <FormControl>
                                                        <Textarea {...field} placeholder="Describe post-disaster access needs" />
                                                      </FormControl>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                              </div>
                                            </div>

                                            {/* 8. Notes and Additional Info */}
                                            <div className="space-y-4 border-t pt-4">
                                              <h3 className="font-semibold text-lg">Notes and Additional Information</h3>
                                              <div className="grid gap-4 grid-cols-1">
                                                <div>
                                                  <FormField
                                                    control={memberForm.control}
                                                    name="notes"
                                                    render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel>Additional Notes</FormLabel>
                                                        <FormControl>
                                                          <Textarea 
                                                            {...field} 
                                                            placeholder="Enter any additional notes or information" 
                                                            className="min-h-[120px]"
                                                          />
                                                        </FormControl>
                                                        <FormDescription>
                                                          Add descriptive notes and include meta tags (e.g., #under18 #needsTranslator) for better searching and categorization.
                                                        </FormDescription>
                                                        <FormMessage />
                                                      </FormItem>
                                                    )}
                                                  />
                                                  
                                                  <div className="mt-4 mb-4">
                                                    <div className="text-sm font-medium mb-2">Add Meta Tags:</div>
                                                    <div className="flex flex-wrap gap-2">
                                                      {["priority", "verified", "incomplete", "followup", "grantEligible", "senior", "disabled", "veteran", "medicalNeeds", "translator"].map(tag => (
                                                        <Button 
                                                          key={tag} 
                                                          type="button" 
                                                          variant="outline" 
                                                          size="sm"
                                                          onClick={() => insertMetaTag('notes', tag)}
                                                          className="text-xs"
                                                        >
                                                          #{tag}
                                                        </Button>
                                                      ))}
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                          const customTag = prompt("Enter custom tag (without # symbol):");
                                                          if (customTag && customTag.trim()) {
                                                            insertMetaTag('notes', customTag.trim());
                                                          }
                                                        }}
                                                        className="text-xs"
                                                      >
                                                        + Custom Tag
                                                      </Button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex justify-end gap-2">
                                              <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => {
                                                  setAddMemberOpen(false);
                                                  setEditingMemberId(null);
                                                  memberForm.reset();
                                                }}
                                              >
                                                Cancel
                                              </Button>
                                              <Button type="submit">Save Member</Button>
                                            </div>
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