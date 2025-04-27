import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  PhoneOff, 
  Send, 
  Save, 
  Mic, 
  BellRing 
} from "lucide-react";

export default function Messages() {
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [channel, setChannel] = useState<string>("email");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: contacts } = useQuery({
    queryKey: ["/api/contacts"],
  });

  const { data: systemConfig } = useQuery({
    queryKey: ["/api/system/config"],
  });

  // Get messages for the current survivor user or from the selected contact
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: [`/api/messages/survivor/${user?.id}`],
    queryFn: ({ queryKey }) => {
      // Only perform the query if user is logged in and is a survivor
      if (user?.id && user.userType === "survivor") {
        return fetch(queryKey[0]).then(res => {
          if (!res.ok) throw new Error("Failed to fetch messages");
          return res.json();
        });
      }
      return Promise.resolve([]);
    },
    enabled: !!user?.id && user.userType === "survivor",
  });

  // Messages by contact (for practitioners)
  const { data: contactMessages, isLoading: contactMessagesLoading } = useQuery({
    queryKey: [`/api/messages/filter?contactId=${selectedContact}`],
    queryFn: ({ queryKey }) => {
      // Only perform the query if contact is selected and user is a practitioner
      if (selectedContact && user?.userType === "practitioner") {
        return fetch(queryKey[0]).then(res => {
          if (!res.ok) throw new Error("Failed to fetch messages");
          return res.json();
        });
      }
      return Promise.resolve([]);
    },
    enabled: selectedContact !== null && user?.userType === "practitioner",
  });

  // Combine both potential message sources
  const displayMessages = user?.userType === "survivor" ? messages : contactMessages;

  // Create message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: {
      survivorId: number;
      contactId?: number;
      content: string;
      channel: string;
      isInbound: boolean;
    }) => {
      const response = await apiRequest("POST", "/api/messages", messageData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries based on user type
      if (user?.userType === "survivor") {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/messages/survivor/${user?.id}`]
        });
      } else {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/messages/filter?contactId=${selectedContact}`]
        });
      }
      
      setMessageContent("");
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message",
      });
    }
  });

  // Mock sending a message for demonstration purposes
  async function sendMessage() {
    if (!messageContent.trim()) return;

    // Instead of sending to the server, we'll just simulate success
    toast({
      title: "Demo Message",
      description: "In a full implementation, your message would be sent now.",
    });
    
    // Clear the message content
    setMessageContent("");
    
    // In a real implementation, the following would happen:
    // const messageData = {
    //   survivorId: user?.userType === "survivor" ? user.id : selectedContact as number,
    //   contactId: selectedContact || undefined,
    //   content: messageContent,
    //   channel: channel,
    //   isInbound: false,
    //   // sentAt is handled by the server
    // };
    // sendMessageMutation.mutate(messageData);
  }

  // Add helper functions for communication
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Success",
        description: "Copied to clipboard!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy text",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        
        {/* System Contact Info - Even more subtle as a badge/tooltip */}
        <div className="text-sm">
          {(systemConfig?.emailAddress || systemConfig?.phoneNumber) ? (
            <div className="flex items-center gap-3">
              {systemConfig.emailAddress && (
                <button
                  onClick={() => copyToClipboard(systemConfig.emailAddress)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                  title="Click to copy email"
                >
                  <Mail className="h-4 w-4" />
                  <span className="hidden sm:inline">{systemConfig.emailAddress}</span>
                </button>
              )}
              {systemConfig.phoneNumber && (
                <a
                  href={`tel:${systemConfig.phoneNumber}`}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                  title="Click to call"
                >
                  <Phone className="h-4 w-4" />
                  <span className="hidden sm:inline">{systemConfig.phoneNumber}</span>
                </a>
              )}
            </div>
          ) : (
            <Link 
              className="text-primary hover:underline text-sm flex items-center gap-1"
              href="/profile"
            >
              <BellRing className="h-4 w-4" />
              <span>Configure Contact Info</span>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-4 lg:col-span-3">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {contacts?.map((contact) => (
                  <Button
                    key={contact.id}
                    variant={selectedContact === contact.id ? "default" : "ghost"}
                    className="w-full justify-start text-base font-normal px-3 py-2 h-auto"
                    onClick={() => setSelectedContact(contact.id)}
                  >
                    {contact.name}
                  </Button>
                ))}
                
                {(!contacts || contacts.length === 0) && (
                  <p className="text-sm text-muted-foreground py-2 px-3">No contacts available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-8 lg:col-span-9">
          <Card className="h-[650px] flex flex-col shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center text-lg">
                {selectedContact ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    {contacts?.find(c => c.id === selectedContact)?.name}
                  </>
                ) : (
                  "Select a contact to start messaging"
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-muted/30">
                {displayMessages?.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isInbound ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`rounded-lg px-4 py-3 max-w-[80%] shadow-sm ${
                        message.isInbound
                          ? "bg-muted text-foreground"
                          : "bg-primary text-primary-foreground"
                        }`}
                    >
                      {/* Channel and status in a more subtle tag format */}
                      <div className="flex justify-between items-center mb-1.5">
                        <Badge 
                          variant="outline" 
                          className="text-[10px] px-1.5 py-0 h-auto font-normal capitalize"
                        >
                          {message.channel}
                        </Badge>
                        <Badge 
                          variant={
                            message.status === 'delivered' ? 'default' : 
                            message.status === 'read' ? 'secondary' :
                            message.status === 'failed' ? 'destructive' : 
                            'outline'
                          }
                          className="text-[10px] px-1.5 py-0 h-auto font-normal ml-1.5"
                        >
                          {message.status}
                        </Badge>
                      </div>
                      
                      {/* Message content with better typography */}
                      <p className="text-sm">{message.content}</p>
                      
                      {/* Message timestamp more subtle */}
                      <p className="text-[10px] opacity-60 mt-1.5 text-right">
                        {format(new Date(message.sentAt), "PPp")}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Loading state */}
                {(messagesLoading || contactMessagesLoading) && (
                  <div className="flex justify-center py-8">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                      <p>Loading messages...</p>
                    </div>
                  </div>
                )}
                
                {/* Empty state */}
                {!messagesLoading && !contactMessagesLoading && 
                 (!displayMessages || displayMessages.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground mb-1">No messages found</p>
                    <p className="text-sm text-muted-foreground/60">
                      {selectedContact ? "Start a conversation" : "Select a contact to begin messaging"}
                    </p>
                  </div>
                )}
              </div>

              {(user?.userType === "survivor" || selectedContact) && (
                <div className="p-4 border-t border-border">
                  {/* Channel selector as a segmented control */}
                  <div className="flex gap-1.5 mb-4 bg-muted rounded-md p-1">
                    <button 
                      className={`flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm flex-1 transition-colors ${
                        channel === "email" 
                          ? "bg-background shadow-sm text-foreground" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setChannel("email")}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Email</span>
                    </button>
                    <button 
                      className={`flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm flex-1 transition-colors ${
                        channel === "sms" 
                          ? "bg-background shadow-sm text-foreground" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setChannel("sms")}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>SMS</span>
                    </button>
                    <button 
                      className={`flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm flex-1 transition-colors ${
                        channel === "call" 
                          ? "bg-background shadow-sm text-foreground" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setChannel("call")}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>Call</span>
                    </button>
                    <button 
                      className={`flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm flex-1 transition-colors ${
                        channel === "system" 
                          ? "bg-background shadow-sm text-foreground" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setChannel("system")}
                    >
                      <BellRing className="h-3.5 w-3.5" />
                      <span>System</span>
                    </button>
                  </div>
                  
                  {/* Adaptive message input based on channel */}
                  {channel === "email" && (
                    <div className="border rounded-md bg-card overflow-hidden">
                      <div className="px-3 py-2 bg-muted/50 border-b">
                        <div className="flex items-center mb-1.5">
                          <span className="text-xs font-medium w-14">To:</span>
                          <span className="text-xs">
                            {selectedContact 
                              ? contacts?.find(c => c.id === selectedContact)?.name
                              : user?.name}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs font-medium w-14">Subject:</span>
                          <span className="text-xs text-muted-foreground">Message regarding your case</span>
                        </div>
                      </div>
                      <div className="p-3">
                        <Textarea
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          placeholder="Type your email message..."
                          className="min-h-[120px] border-0 focus-visible:ring-0 shadow-none resize-none"
                        />
                        <div className="flex justify-end mt-3">
                          <Button 
                            onClick={sendMessage}
                            disabled={!messageContent.trim() || sendMessageMutation.isPending}
                            className="gap-2"
                            size="sm"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {sendMessageMutation.isPending ? "Sending..." : "Send Email"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {channel === "sms" && (
                    <div className="border rounded-md bg-card">
                      <div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs">
                          To: {selectedContact 
                            ? contacts?.find(c => c.id === selectedContact)?.name
                            : user?.name}
                        </span>
                      </div>
                      <div className="p-3 rounded-md flex gap-2 items-end">
                        <Textarea
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          placeholder="Type your text message..."
                          className="bg-muted resize-none border-0 focus-visible:ring-0 shadow-none min-h-0 h-[80px]"
                        />
                        <Button 
                          onClick={sendMessage}
                          disabled={!messageContent.trim() || sendMessageMutation.isPending}
                          className="rounded-full aspect-square p-2 h-10 w-10"
                          size="icon"
                        >
                          <Send className="h-4 w-4" />
                          <span className="sr-only">Send Text</span>
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {channel === "call" && (
                    <div className="border rounded-md bg-card">
                      <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs">
                            Call to: {selectedContact 
                              ? contacts?.find(c => c.id === selectedContact)?.name
                              : user?.name}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] py-0 h-4">Demo</Badge>
                      </div>
                      <div className="p-3">
                        <div className="bg-muted rounded-md p-3 mb-3">
                          <p className="text-xs text-muted-foreground mb-2">Call Notes:</p>
                          <Textarea
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                            placeholder="Enter call notes for this conversation..."
                            className="border-none bg-background resize-none focus-visible:ring-0 shadow-none text-sm h-[80px]"
                          />
                        </div>
                        <div className="flex justify-center gap-3">
                          <Button 
                            variant="outline" 
                            className="rounded-full h-9 w-9 p-0"
                            size="icon"
                          >
                            <Mic className="h-3.5 w-3.5" />
                            <span className="sr-only">Mic</span>
                          </Button>
                          <Button 
                            variant="destructive" 
                            className="rounded-full h-9 w-9 p-0"
                            size="icon"
                          >
                            <PhoneOff className="h-3.5 w-3.5" />
                            <span className="sr-only">End Call</span>
                          </Button>
                          <Button 
                            onClick={sendMessage}
                            disabled={!messageContent.trim() || sendMessageMutation.isPending}
                            className="rounded-full h-9 w-9 p-0"
                            variant="default"
                            size="icon"
                          >
                            <Save className="h-3.5 w-3.5" />
                            <span className="sr-only">Save Call Notes</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {channel === "system" && (
                    <div className="border rounded-md bg-card">
                      <div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2">
                        <BellRing className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">System Notification</span>
                      </div>
                      <div className="p-3">
                        <Textarea
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          placeholder="Enter system notification message..."
                          className="min-h-[80px] border-0 focus-visible:ring-0 shadow-none resize-none bg-muted"
                        />
                        <div className="flex justify-end mt-3">
                          <Button 
                            onClick={sendMessage}
                            disabled={!messageContent.trim() || sendMessageMutation.isPending}
                            size="sm"
                          >
                            {sendMessageMutation.isPending ? "Sending..." : "Send Notification"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}