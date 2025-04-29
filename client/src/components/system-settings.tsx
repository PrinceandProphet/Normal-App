import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { UpdateOrganizationSettings } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface SystemSettingsProps {
  organizationId: number;
}

export default function SystemSettings({ organizationId }: SystemSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: organization, isLoading } = useQuery({
    queryKey: [`/api/organizations/${organizationId}`],
    enabled: !!organizationId,
  });
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UpdateOrganizationSettings>({
    resolver: zodResolver(undefined), // No resolver needed as we're using simple validations
    defaultValues: {
      logoUrl: "",
      primaryColor: "#0070F3",
      defaultSmsName: "",
      enableMessaging: true,
      enableCalendar: true,
      enableActionPlan: true,
      enableDocuments: true,
      enableHouseholdManagement: true,
      enableFundingOpportunities: true,
    },
  });

  // Reset form with organization data when loaded
  React.useEffect(() => {
    if (organization) {
      reset({
        logoUrl: organization.logoUrl || "",
        primaryColor: organization.primaryColor || "#0070F3",
        defaultSmsName: organization.defaultSmsName || "",
        enableMessaging: organization.enableMessaging !== false,
        enableCalendar: organization.enableCalendar !== false,
        enableActionPlan: organization.enableActionPlan !== false, 
        enableDocuments: organization.enableDocuments !== false,
        enableHouseholdManagement: organization.enableHouseholdManagement !== false,
        enableFundingOpportunities: organization.enableFundingOpportunities !== false,
      });
    }
  }, [organization, reset]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: UpdateOrganizationSettings) => {
      const response = await apiRequest(
        "PATCH",
        `/api/organizations/${organizationId}/settings`,
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your organization settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${organizationId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateOrganizationSettings) => {
    updateSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="features">Feature Toggles</TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Organization Branding</CardTitle>
              <CardDescription>
                Customize your organization's visual identity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://example.com/logo.png"
                  {...register("logoUrl")}
                />
                {errors.logoUrl && (
                  <p className="text-sm text-red-500">{errors.logoUrl.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Enter a URL to your organization's logo (PNG or SVG recommended).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex space-x-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    className="w-12 h-10"
                    {...register("primaryColor")}
                  />
                  <Input
                    value={watch("primaryColor")}
                    onChange={(e) => setValue("primaryColor", e.target.value)}
                    placeholder="#0070F3"
                    className="flex-1"
                  />
                </div>
                {errors.primaryColor && (
                  <p className="text-sm text-red-500">{errors.primaryColor.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Choose a primary color for your organization's branding.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications">
          <Card>
            <CardHeader>
              <CardTitle>Communication Settings</CardTitle>
              <CardDescription>
                Configure how your organization communicates with survivors.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultSmsName">Default SMS Name</Label>
                <Input
                  id="defaultSmsName"
                  placeholder="Recovery Support"
                  {...register("defaultSmsName")}
                />
                {errors.defaultSmsName && (
                  <p className="text-sm text-red-500">{errors.defaultSmsName.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  This name will appear as the sender for SMS messages.
                </p>
              </div>

              {/* Email settings are configured separately in the email configuration section */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Email Configuration</AlertTitle>
                <AlertDescription>
                  Email settings are configured in the Email Configuration section,
                  where you can set up your domain, sender name, and verify your domain.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Toggles Tab */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Toggles</CardTitle>
              <CardDescription>
                Enable or disable features for your organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Messaging</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow survivors and practitioners to send/receive messages.
                    </p>
                  </div>
                  <Switch
                    checked={watch("enableMessaging")}
                    onCheckedChange={(checked) => setValue("enableMessaging", checked)}
                  />
                </div>
                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Calendar</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable appointment scheduling and calendar functionality.
                    </p>
                  </div>
                  <Switch
                    checked={watch("enableCalendar")}
                    onCheckedChange={(checked) => setValue("enableCalendar", checked)}
                  />
                </div>
                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Action Plan</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable S.T.A.R.T recovery action plans and task tracking.
                    </p>
                  </div>
                  <Switch
                    checked={watch("enableActionPlan")}
                    onCheckedChange={(checked) => setValue("enableActionPlan", checked)}
                  />
                </div>
                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Document Management</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable document upload, storage and management.
                    </p>
                  </div>
                  <Switch
                    checked={watch("enableDocuments")}
                    onCheckedChange={(checked) => setValue("enableDocuments", checked)}
                  />
                </div>
                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Household Management</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable detailed household and property management features.
                    </p>
                  </div>
                  <Switch
                    checked={watch("enableHouseholdManagement")}
                    onCheckedChange={(checked) => setValue("enableHouseholdManagement", checked)}
                  />
                </div>
                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Funding Opportunities</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable funding opportunity matching and tracking.
                    </p>
                  </div>
                  <Switch
                    checked={watch("enableFundingOpportunities")}
                    onCheckedChange={(checked) => setValue("enableFundingOpportunities", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-6">
        <Button
          type="submit"
          disabled={updateSettingsMutation.isPending}
          className="min-w-32"
        >
          {updateSettingsMutation.isPending ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>
    </form>
  );
}