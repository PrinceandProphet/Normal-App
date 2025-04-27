import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ClipboardCopy, AlertTriangle, HelpCircle, RefreshCcw, Shield } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import type { Organization } from "@shared/schema";

interface EmailConfigurationProps {
  organization: Organization;
  onUpdate: (updatedOrg: Organization) => void;
}

export function EmailConfiguration({ organization, onUpdate }: EmailConfigurationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [emailDomain, setEmailDomain] = useState(organization.emailDomain || "");
  const [emailSenderName, setEmailSenderName] = useState(organization.emailSenderName || "");
  const [emailSenderEmail, setEmailSenderEmail] = useState(organization.emailSenderEmail || "");
  
  // Get DNS verification records
  const { data: dnsRecords, isLoading: isLoadingDns } = useQuery({
    queryKey: ['/api/organizations', organization.id, 'email', 'dns-records'],
    queryFn: async () => {
      if (!organization.emailDomain) return null;
      const res = await apiRequest('GET', `/api/organizations/${organization.id}/email/dns-records`);
      return res.ok ? await res.json() : null;
    },
    enabled: !!organization.emailDomain
  });
  
  // Update organization settings mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (data: Partial<Organization>) => {
      const res = await apiRequest('PATCH', `/api/organizations/${organization.id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update organization");
      }
      return await res.json();
    },
    onSuccess: (updatedOrg) => {
      toast({
        title: "Settings updated",
        description: "Email configuration has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', organization.id] });
      onUpdate(updatedOrg);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Failed to update email settings",
      });
    }
  });
  
  // Verify domain mutation
  const verifyDomainMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/organizations/${organization.id}/email/verify-domain`, {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Domain verification failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Domain verified",
        description: "Your domain was successfully verified.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', organization.id] });
      onUpdate(data.organization);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Failed to verify domain. Please check your DNS records.",
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateOrgMutation.mutate({
      emailDomain,
      emailSenderName,
      emailSenderEmail: emailSenderEmail || `noreply@${emailDomain}`,
    });
  };
  
  // Handle verification
  const handleVerify = () => {
    if (!organization.emailDomain) {
      toast({
        variant: "destructive",
        title: "Domain required",
        description: "Please save a domain first before verifying.",
      });
      return;
    }
    
    verifyDomainMutation.mutate();
  };
  
  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard.",
    });
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>
              Configure custom email domain for your organization
            </CardDescription>
          </div>
          <div>
            {organization.emailDomainVerified ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                <Check className="h-3 w-3" /> Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                <AlertTriangle className="h-3 w-3" /> Unverified
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Domain Settings */}
          <div className="space-y-4">
            <h3 className="text-md font-medium">Domain Settings</h3>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="emailDomain">
                  Email Domain
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 ml-1 inline-block text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="w-80">
                        <p>Enter your organization's domain name (e.g., example.org).</p>
                        <p className="mt-2">You'll need to verify ownership by adding DNS records.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="emailDomain"
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value)}
                  placeholder="yourdomain.org"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="senderName">Default Sender Name</Label>
                <Input
                  id="senderName"
                  value={emailSenderName}
                  onChange={(e) => setEmailSenderName(e.target.value)}
                  placeholder="Your Organization Name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="senderEmail">
                  Default Sender Email
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 ml-1 inline-block text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        If left empty, it will default to noreply@yourdomain.org
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="senderEmail"
                  value={emailSenderEmail}
                  onChange={(e) => setEmailSenderEmail(e.target.value)}
                  placeholder={`noreply@${emailDomain || 'yourdomain.org'}`}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="submit"
                disabled={updateOrgMutation.isPending}
                className="gap-2"
              >
                {updateOrgMutation.isPending ? (
                  <>
                    <RefreshCcw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </div>
          
          <Separator />
          
          {/* Domain Verification */}
          {emailDomain && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium">Domain Verification</h3>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={verifyDomainMutation.isPending || !emailDomain}
                      className="gap-2"
                    >
                      {verifyDomainMutation.isPending ? (
                        <>
                          <RefreshCcw className="h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4" />
                          Verify Domain
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Verify Domain Ownership</AlertDialogTitle>
                      <AlertDialogDescription>
                        <p>This will check if you've correctly added the required DNS records to your domain.</p>
                        <p className="mt-2">Make sure you've added all the records below before proceeding with verification.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleVerify}>
                        Verify Now
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              {dnsRecords ? (
                <div className="space-y-4">
                  <p className="text-sm">
                    Add these DNS records to your domain to verify ownership and enable email sending:
                  </p>
                  
                  {/* SPF Record */}
                  <div className="bg-muted p-4 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">SPF Record (TXT)</h4>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => copyToClipboard(dnsRecords.spfRecord)}
                      >
                        <ClipboardCopy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs font-mono break-all">{dnsRecords.spfRecord}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Add this as a TXT record for @ (root domain)
                    </p>
                  </div>
                  
                  {/* DKIM Record */}
                  <div className="bg-muted p-4 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">DKIM Record (TXT)</h4>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => copyToClipboard(dnsRecords.dkimRecord)}
                      >
                        <ClipboardCopy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs font-mono break-all">{dnsRecords.dkimRecord}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Add this as a TXT record for the subdomain em._domainkey
                    </p>
                  </div>
                  
                  {/* DMARC Record */}
                  <div className="bg-muted p-4 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">DMARC Record (TXT)</h4>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => copyToClipboard(dnsRecords.dmarcRecord)}
                      >
                        <ClipboardCopy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs font-mono break-all">{dnsRecords.dmarcRecord}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Add this as a TXT record for the subdomain _dmarc
                    </p>
                  </div>
                </div>
              ) : isLoadingDns ? (
                <div className="flex justify-center items-center h-40">
                  <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Save your domain settings first to get the required DNS records.
                </div>
              )}
            </div>
          )}
          
          {/* Current Status */}
          <div className="bg-muted p-4 rounded-md mt-6">
            <h3 className="text-md font-medium mb-2">Current Email Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Domain:</span>
                <span className="text-sm font-medium">
                  {organization.emailDomain || "Not configured"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Verification:</span>
                <span className="text-sm font-medium">
                  {organization.emailDomainVerified ? (
                    <span className="text-green-600">Verified</span>
                  ) : (
                    <span className="text-amber-600">Pending</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Default Sender:</span>
                <span className="text-sm font-medium">
                  {organization.emailSenderName ? (
                    <>
                      {organization.emailSenderName} &lt;{organization.emailSenderEmail || `noreply@${organization.emailDomain || "disasterrecovery.app"}`}&gt;
                    </>
                  ) : (
                    "Not configured"
                  )}
                </span>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}