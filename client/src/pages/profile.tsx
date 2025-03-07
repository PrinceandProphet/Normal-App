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
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHouseholdMemberSchema } from "@shared/schema";
import type { HouseholdMember } from "@shared/schema";
import { useState } from "react";
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

  const { data: householdMembers = [] } = useQuery<HouseholdMember[]>({
    queryKey: ["/api/household-members"],
  });

  const form = useForm({
    resolver: zodResolver(insertHouseholdMemberSchema),
    defaultValues: {
      name: "",
      type: "adult",
      age: undefined,
      relationship: "",
      species: "",
      notes: "",
    },
  });

  const addHouseholdMember = async (values: any) => {
    try {
      await apiRequest("POST", "/api/household-members", values);
      queryClient.invalidateQueries({ queryKey: ["/api/household-members"] });
      setAddMemberOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Household member added successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add household member",
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
          <h2 className="text-lg font-semibold mb-4">Properties & Household</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Primary Residence:</p>
                    <p className="font-mono bg-muted p-2 rounded text-sm">
                      No property added yet
                    </p>
                  </div>
                  <Button variant="outline" disabled>
                    Add Property
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Coming soon: Add and manage your properties for disaster planning.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Household Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {householdMembers.length > 0 ? (
                    <div className="space-y-4">
                      {householdMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {member.type === "pet"
                                ? `${member.species}`
                                : `${member.relationship}${member.age ? `, ${member.age} years` : ""}`}
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
                      <Button className="w-full">
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
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
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

                          {form.watch("type") !== "pet" && (
                            <>
                              <FormField
                                control={form.control}
                                name="age"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Age</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="relationship"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Relationship</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select relationship" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="spouse">Spouse</SelectItem>
                                        <SelectItem value="partner">Partner</SelectItem>
                                        <SelectItem value="son">Son</SelectItem>
                                        <SelectItem value="daughter">Daughter</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                            </>
                          )}

                          {form.watch("type") === "pet" && (
                            <FormField
                              control={form.control}
                              name="species"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Species</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select species" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="dog">Dog</SelectItem>
                                      <SelectItem value="cat">Cat</SelectItem>
                                      <SelectItem value="bird">Bird</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          )}

                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder="Add any additional information..."
                                  />
                                </FormControl>
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