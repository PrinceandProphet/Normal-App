import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Profile() {
  const { toast } = useToast();
  
  const { data: systemConfig } = useQuery({
    queryKey: ["/api/system/config"],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>System Email Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemConfig?.emailAddress ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Current System Email:</p>
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
                <Button 
                  onClick={async () => {
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
                  }}
                >
                  Generate Email Inbox
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
