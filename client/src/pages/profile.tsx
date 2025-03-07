import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Phone } from "lucide-react";

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
                  <p className="font-mono bg-muted p-2 rounded">{systemConfig.emailAddress}</p>
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
                  <p className="font-mono bg-muted p-2 rounded">{systemConfig.phoneNumber}</p>
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
  );
}