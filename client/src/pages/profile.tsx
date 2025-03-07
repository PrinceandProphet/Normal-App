import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Phone, Home, CreditCard, Users } from "lucide-react";
import { Input } from "@/components/ui/input"; // Assuming this import is correct

export default function Profile() {
  const { toast } = useToast();

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
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Current Members:</p>
                    <p className="font-mono bg-muted p-2 rounded text-sm">
                      No household members added
                    </p>
                  </div>
                  <Button variant="outline" disabled>
                    Add Household Member
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Coming soon: Add and manage household members for each property.
                  </p>
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