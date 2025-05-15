import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const EmailTestPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [testEmailStatus, setTestEmailStatus] = useState<any>(null);
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: 'Test Email from Normal Restored',
    text: 'This is a test email from Normal Restored. If you received this, the email system is working correctly!',
    html: '<p>This is a test email from Normal Restored.</p><p>If you received this, the email system is working correctly!</p>',
    fromName: 'Normal Restored Test',
    fromEmail: 'noreply@normalrestored.com'
  });

  // Only allow super_admin users to access this page
  if (!user || user.role !== 'super_admin') {
    return <Redirect to="/" />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmailForm(prev => ({ ...prev, [name]: value }));
  };

  const testApiConnection = async () => {
    setLoading(true);
    setApiStatus(null);
    
    try {
      const response = await fetch('/api/test-brevo-connection');
      const data = await response.json();
      setApiStatus(data);
      
      if (data.success) {
        toast({
          title: 'API Connection Success',
          description: 'Successfully connected to Brevo API',
          variant: 'default',
        });
      } else {
        toast({
          title: 'API Connection Failed',
          description: data.message || 'Failed to connect to Brevo API',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error testing API connection:', error);
      setApiStatus({
        success: false,
        message: 'Network error occurred',
        error: error instanceof Error ? error.message : String(error)
      });
      
      toast({
        title: 'Connection Error',
        description: 'An error occurred while testing the API connection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTestEmailStatus(null);
    
    try {
      const response = await fetch('/api/test-brevo-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailForm),
      });
      
      const data = await response.json();
      setTestEmailStatus(data);
      
      if (data.success) {
        toast({
          title: 'Email Sent Successfully',
          description: `Test email sent to ${emailForm.to}`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Email Sending Failed',
          description: data.message || 'Failed to send test email',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setTestEmailStatus({
        success: false,
        message: 'Network error occurred',
        error: error instanceof Error ? error.message : String(error)
      });
      
      toast({
        title: 'Email Error',
        description: 'An error occurred while sending the test email',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-5xl py-10">
      <h1 className="text-3xl font-bold mb-8">Brevo Email Testing</h1>
      
      <div className="text-sm text-muted-foreground mb-6">
        This page allows you to test the Brevo email integration. You can verify your API key and send test emails.
        Check the server logs for detailed debugging information.
      </div>
      
      <Alert className="mb-6">
        <AlertTitle>Super Admin Only</AlertTitle>
        <AlertDescription>
          This testing tool is only available in development mode for super admin users.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="send" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="send">Send Test Email</TabsTrigger>
          <TabsTrigger value="check">Check API Connection</TabsTrigger>
        </TabsList>
        
        <TabsContent value="check">
          <Card>
            <CardHeader>
              <CardTitle>Verify Brevo API Connection</CardTitle>
              <CardDescription>
                Test if your Brevo API key is valid and can connect to the Brevo API.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Button 
                onClick={testApiConnection} 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    Test Connection
                  </>
                )}
              </Button>
              
              {apiStatus && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">
                    {apiStatus.success ? (
                      <span className="text-green-500 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2" /> Connection Successful
                      </span>
                    ) : (
                      <span className="text-red-500">Connection Failed</span>
                    )}
                  </h3>
                  
                  <div className="mt-4 p-4 bg-muted rounded-md">
                    <pre className="whitespace-pre-wrap text-sm">
                      {JSON.stringify(apiStatus, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>
                Send a test email to verify that the email delivery system is working.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={sendTestEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="to">Recipient Email *</Label>
                  <Input
                    id="to"
                    name="to"
                    type="email"
                    placeholder="recipient@example.com"
                    value={emailForm.to}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="Test Email Subject"
                    value={emailForm.subject}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      name="fromName"
                      placeholder="Sender Name"
                      value={emailForm.fromName}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      name="fromEmail"
                      type="email"
                      placeholder="sender@example.com"
                      value={emailForm.fromEmail}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="text">Plain Text Content</Label>
                  <Textarea
                    id="text"
                    name="text"
                    placeholder="Plain text email content"
                    rows={3}
                    value={emailForm.text}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="html">HTML Content</Label>
                  <Textarea
                    id="html"
                    name="html"
                    placeholder="HTML email content"
                    rows={5}
                    value={emailForm.html}
                    onChange={handleInputChange}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !emailForm.to}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
            
            {testEmailStatus && (
              <CardFooter className="flex flex-col">
                <h3 className="text-lg font-medium mb-2 self-start">
                  {testEmailStatus.success ? (
                    <span className="text-green-500 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" /> Email Sent Successfully
                    </span>
                  ) : (
                    <span className="text-red-500">Email Sending Failed</span>
                  )}
                </h3>
                
                <div className="w-full mt-4 p-4 bg-muted rounded-md max-h-96 overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(testEmailStatus, null, 2)}
                  </pre>
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="text-sm text-muted-foreground mt-8">
        <p className="mb-2">Troubleshooting Tips:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Make sure your BREVO_API_KEY is set in the environment variables</li>
          <li>Check that your IP address is whitelisted in Brevo</li>
          <li>Verify that the sender email domain is authorized in Brevo</li>
          <li>Examine the server logs for detailed error information</li>
        </ul>
      </div>
    </div>
  );
};

export default EmailTestPage;