import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, CheckCircle, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";

interface EmailSettingsProps {
  organizationId: number;
}

interface EmailSettings {
  emailDomain?: string;
  emailDomainVerified?: boolean;
  emailProvider?: string;
  emailSenderName?: string;
  emailSenderAddress?: string;
  emailDkimKey?: string;
  emailSpfRecord?: string;
  emailDmarcRecord?: string;
}

interface DnsRecord {
  name: string;
  type: string;
  value: string;
}

interface DnsRecordsResponse {
  dkimRecord: DnsRecord;
  spfRecord: DnsRecord;
  dmarcRecord: DnsRecord;
  instructions: string[];
}

export default function EmailSettings({ organizationId }: EmailSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const clipboard = useClipboard();
  const [activeTab, setActiveTab] = useState("general");
  
  // Get email settings
  const { 
    data: emailSettings,
    isLoading: isLoadingSettings,
    isError: isErrorSettings 
  } = useQuery({
    queryKey: [`/api/email-config/${organizationId}`],
    enabled: !!organizationId,
  });
  
  // Get DNS records
  const { 
    data: dnsRecords,
    isLoading: isLoadingDns,
    isError: isErrorDns,
    refetch: refetchDns
  } = useQuery<DnsRecordsResponse>({
    queryKey: [`/api/email-config/${organizationId}/dns-records`],
    enabled: !!organizationId && !!emailSettings?.emailDomain,
  });
  
  // Form state
  const [formData, setFormData] = useState<EmailSettings>({
    emailDomain: "",
    emailProvider: "system",
    emailSenderName: "",
    emailSenderAddress: "",
  });
  
  // Update form when settings are loaded
  useEffect(() => {
    if (emailSettings) {
      setFormData({
        emailDomain: emailSettings.emailDomain || "",
        emailProvider: emailSettings.emailProvider || "system",
        emailSenderName: emailSettings.emailSenderName || "",
        emailSenderAddress: emailSettings.emailSenderAddress || "",
      });
    }
  }, [emailSettings]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };
  
  // Update email settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: EmailSettings) => {
      const res = await apiRequest(
        "PUT", 
        `/api/email-config/${organizationId}`,
        data
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email settings updated",
        description: "Your email configuration has been saved.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/email-config/${organizationId}`],
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Verify domain
  const verifyDomainMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST", 
        `/api/email-config/${organizationId}/verify`,
        {}
      );
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Domain verified",
          description: "Your domain has been verified successfully.",
        });
      } else {
        toast({
          title: "Verification failed",
          description: data.message || "Could not verify domain. Please check your DNS settings.",
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({
        queryKey: [`/api/email-config/${organizationId}`],
      });
    },
    onError: (error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate DNS records
  const generateDnsRecordsMutation = useMutation({
    mutationFn: async () => {
      await refetchDns();
      return true;
    },
    onSuccess: () => {
      toast({
        title: "DNS records generated",
        description: "Your DNS records have been generated. Please add them to your domain provider.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to generate DNS records",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(formData);
  };
  
  const handleVerifyDomain = () => {
    verifyDomainMutation.mutate();
  };
  
  const handleGenerateDnsRecords = () => {
    generateDnsRecordsMutation.mutate();
  };
  
  const copyToClipboard = (text: string) => {
    clipboard.copy(text);
    toast({
      title: "Copied to clipboard",
      description: "Text copied to clipboard successfully.",
    });
  };

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isErrorSettings) {
    return (
      <div className="rounded-md bg-destructive/10 p-4">
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm font-medium text-destructive">Failed to load email settings</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Email Configuration</CardTitle>
        <CardDescription>
          Configure your organization's email settings for sending emails from your own domain.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="dns">DNS Records</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="emailDomain">Email Domain</Label>
                <div className="flex gap-2 items-center mt-1.5">
                  <Input
                    id="emailDomain"
                    name="emailDomain"
                    placeholder="yourdomain.com"
                    value={formData.emailDomain}
                    onChange={handleInputChange}
                  />
                  {emailSettings?.emailDomainVerified ? (
                    <Badge className="gap-1" variant="outline">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      Verified
                    </Badge>
                  ) : emailSettings?.emailDomain ? (
                    <Badge className="gap-1" variant="outline">
                      <XCircle className="h-3.5 w-3.5 text-amber-500" />
                      Unverified
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Enter your domain without http/https (e.g., example.com)
                </p>
              </div>

              <div>
                <Label htmlFor="emailProvider">Email Provider</Label>
                <Input
                  id="emailProvider"
                  name="emailProvider"
                  value={formData.emailProvider}
                  onChange={handleInputChange}
                  placeholder="system"
                />
                <p className="text-sm text-muted-foreground mt-1.5">
                  Use "system" to use our email service or specify your provider
                </p>
              </div>

              <div>
                <Label htmlFor="emailSenderName">Default Sender Name</Label>
                <Input
                  id="emailSenderName"
                  name="emailSenderName"
                  value={formData.emailSenderName}
                  onChange={handleInputChange}
                  placeholder="Your Organization Name"
                />
                <p className="text-sm text-muted-foreground mt-1.5">
                  The name that will appear in the "From" field of emails
                </p>
              </div>

              <div>
                <Label htmlFor="emailSenderAddress">Default Sender Email</Label>
                <Input
                  id="emailSenderAddress"
                  name="emailSenderAddress"
                  value={formData.emailSenderAddress}
                  onChange={handleInputChange}
                  placeholder={`noreply@${formData.emailDomain || 'yourdomain.com'}`}
                />
                <p className="text-sm text-muted-foreground mt-1.5">
                  The email address that will be used as the sender (leave empty for noreply@yourdomain.com)
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
              {emailSettings?.emailDomain && !emailSettings?.emailDomainVerified && (
                <Button variant="outline" onClick={handleVerifyDomain} disabled={verifyDomainMutation.isPending}>
                  {verifyDomainMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Domain"
                  )}
                </Button>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="dns" className="space-y-6">
            {!emailSettings?.emailDomain ? (
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm">
                  Please set your email domain in the General Settings tab first.
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">DNS Records for {emailSettings.emailDomain}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateDnsRecords}
                    disabled={generateDnsRecordsMutation.isPending}
                  >
                    {generateDnsRecordsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate
                      </>
                    )}
                  </Button>
                </div>

                {isLoadingDns ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : isErrorDns || !dnsRecords ? (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                    <p className="text-sm text-amber-700">
                      Could not load DNS records. Please try regenerating them.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                      Add these DNS records to your domain provider's DNS settings to verify your domain and enable email sending.
                    </p>

                    {/* DKIM Record */}
                    <div className="rounded-md border">
                      <div className="bg-muted px-4 py-2 rounded-t-md">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">DKIM Record (TXT)</h4>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(dnsRecords.dkimRecord.value)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Record Name:</p>
                          <code className="bg-muted p-1 rounded text-xs block mt-1 overflow-x-auto whitespace-nowrap">
                            {dnsRecords.dkimRecord.name}
                          </code>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Record Value:</p>
                          <code className="bg-muted p-1 rounded text-xs block mt-1 overflow-x-auto whitespace-nowrap">
                            {dnsRecords.dkimRecord.value}
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* SPF Record */}
                    <div className="rounded-md border">
                      <div className="bg-muted px-4 py-2 rounded-t-md">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">SPF Record (TXT)</h4>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(dnsRecords.spfRecord.value)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Record Name:</p>
                          <code className="bg-muted p-1 rounded text-xs block mt-1 overflow-x-auto whitespace-nowrap">
                            {dnsRecords.spfRecord.name}
                          </code>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Record Value:</p>
                          <code className="bg-muted p-1 rounded text-xs block mt-1 overflow-x-auto whitespace-nowrap">
                            {dnsRecords.spfRecord.value}
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* DMARC Record */}
                    <div className="rounded-md border">
                      <div className="bg-muted px-4 py-2 rounded-t-md">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">DMARC Record (TXT)</h4>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(dnsRecords.dmarcRecord.value)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Record Name:</p>
                          <code className="bg-muted p-1 rounded text-xs block mt-1 overflow-x-auto whitespace-nowrap">
                            {dnsRecords.dmarcRecord.name}
                          </code>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Record Value:</p>
                          <code className="bg-muted p-1 rounded text-xs block mt-1 overflow-x-auto whitespace-nowrap">
                            {dnsRecords.dmarcRecord.value}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md bg-blue-50 border border-blue-100 p-4 mt-4">
                      <h4 className="font-medium text-blue-700 mb-2">Next Steps</h4>
                      <ol className="space-y-2 pl-5 list-decimal text-sm text-blue-700">
                        {dnsRecords.instructions.map((instruction, i) => (
                          <li key={i}>{instruction}</li>
                        ))}
                        <li>After adding these records, return here and click "Verify Domain" to complete the setup.</li>
                      </ol>
                    </div>
                    
                    <div className="mt-4 flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        className="gap-2" 
                        onClick={() => window.open('https://dns-lookup.com', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Check DNS Propagation
                      </Button>
                      
                      <Button 
                        onClick={handleVerifyDomain} 
                        disabled={verifyDomainMutation.isPending}
                      >
                        {verifyDomainMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          "Verify Domain"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t bg-muted/50 px-6 py-3">
        <p className="text-xs text-muted-foreground">
          Need help? Contact our support team for assistance with email configuration.
        </p>
      </CardFooter>
    </Card>
  );
}