import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Phone, Home, CreditCard, Users, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHouseholdMemberSchema } from "@shared/schema";
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
import { useForm } from "react-hook-form";

export default function Profile() {
  const { toast } = useToast();
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const { data: systemConfig } = useQuery({
    queryKey: ["/api/system/config"],
  });

  // Changed to refetch on mount and window focus
  const { data: householdMembers = [], isLoading } = useQuery<HouseholdMember[]>({
    queryKey: ["/api/household-members"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
      await apiRequest("POST", "/api/household-members", values);
      // Force an immediate refetch
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/household-members"],
        refetchType: 'active',
      });
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

  const generateInbox = async () => {
    try {
      await apiRequest("POST", "/api/system/config/generate", {});
      queryClient.invalidateQueries({ queryKey: ["/api/system/config"] });
      toast({
        title: "Success",
        description: "Email inbox created successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create email inbox",
      });
    }
  };

  const generatePhone = async () => {
    try {
      await apiRequest("POST", "/api/system/config/generate/phone", {});
      queryClient.invalidateQueries({ queryKey: ["/api/system/config"] });
      toast({
        title: "Success",
        description: "Phone number created successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create phone number",
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>

      <div className="grid gap-6">
        {/* Communication Settings Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Communication Settings</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  System Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemConfig?.emailAddress ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Current Email Address:</p>
                      <p className="font-mono bg-muted p-2 rounded">
                        {systemConfig.emailAddress}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This email address is used for all system communications.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        No email address configured. Click below to generate a new email inbox.
                      </p>
                      <Button onClick={generateInbox}>Generate Email Inbox</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  System Phone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemConfig?.phoneNumber ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Current Phone Number:</p>
                      <p className="font-mono bg-muted p-2 rounded">
                        {systemConfig.phoneNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This phone number is used for SMS communications.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        No phone number configured. Click below to generate a new phone number.
                      </p>
                      <Button onClick={generatePhone}>Generate Phone Number</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Properties & Household Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Household Members</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Household Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <p>Loading...</p>
                ) : householdMembers && householdMembers.length > 0 ? (
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No household members added yet.
                  </p>
                )}

                <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Household Member
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
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Billing Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Billing</h2>
          <div className="grid gap-6 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Plan & Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Current Plan:</p>
                    <p className="font-mono bg-muted p-2 rounded text-sm">
                      Basic Plan (Free)
                    </p>
                  </div>

                  {/* Payment Method Section */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Payment Method:</p>
                    <p className="font-mono bg-muted p-2 rounded text-sm">
                      No payment method added
                    </p>
                    <Button variant="outline" disabled>
                      Update Payment Method
                    </Button>
                  </div>

                  {/* Promo Code Section */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Promo Code:</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter promo code"
                        disabled
                        className="max-w-[200px]"
                      />
                      <Button variant="outline" disabled>
                        Apply
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Coming soon: Apply promo codes from non-profit organizations
                    </p>
                  </div>

                  {/* Plan Management */}
                  <div className="space-y-2">
                    <Button variant="outline" disabled className="w-full">
                      Upgrade Plan
                    </Button>
                    <Button variant="ghost" disabled className="w-full text-destructive">
                      Cancel Subscription
                    </Button>
                  </div>

                  {/* Data Export */}
                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-sm font-medium">Account Data:</p>
                    <Button variant="outline" disabled className="w-full">
                      Export All Data
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Coming soon: Export all your data in a portable format
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Coming soon: Manage your subscription, payment methods, and access premium features
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}