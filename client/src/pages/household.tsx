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
import { MemberForm, MemberList } from "./member-form";


export default function HouseholdPage() {
  const { toast } = useToast();
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
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

  const { data: householdMembers = [] } = useQuery({
    queryKey: ["/api/household-members", selectedGroupId],
    queryFn: async () => {
      console.log("[DEBUG] Fetching members, selectedGroupId:", selectedGroupId);
      if (!selectedGroupId) return [];
      try {
        const response = await apiRequest<HouseholdMember[]>(
          "GET",
          `/api/household-members?groupId=${selectedGroupId}`
        );
        console.log("[DEBUG] API Response for members:", response);
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("[DEBUG] Error fetching members:", error);
        return [];
      }
    },
    enabled: !!selectedGroupId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Monitor changes to householdMembers
  useEffect(() => {
    console.log("[DEBUG] householdMembers updated:", householdMembers);
  }, [householdMembers]);

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


  useEffect(() => {
    const memberTags = Array.isArray(householdMembers)
      ? householdMembers.reduce((tags: string[], member) => {
          if (Array.isArray(member.qualifyingTags)) {
            return [...tags, ...member.qualifyingTags];
          }
          return tags;
        }, [])
      : [];

    setAvailableTags([...new Set(memberTags)]);
  }, [householdMembers]);

  // Function to handle fuzzy search
  const searchTags = (query: string) => {
    const normalizedQuery = query.toLowerCase();
    return availableTags.filter((tag) => tag.toLowerCase().includes(normalizedQuery));
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
              <Button variant="ghost" onClick={() => setSelectedPropertyId(property.id)}>
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
                            <MemberList groupId={selectedGroupId} members={householdMembers} />
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