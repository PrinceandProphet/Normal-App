import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    queryKey: ["/api/messages/survivor", user?.id],
    enabled: !!user?.id && user.userType === "survivor",
  });

  // Messages by contact (for practitioners)
  const { data: contactMessages, isLoading: contactMessagesLoading } = useQuery({
    queryKey: ["/api/messages/filter", { contactId: selectedContact }],
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
          queryKey: ["/api/messages/survivor", user?.id]
        });
      } else {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/messages/filter", { contactId: selectedContact }]
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

  async function sendMessage() {
    if (!messageContent.trim()) return;

    const messageData = {
      survivorId: user?.userType === "survivor" ? user.id : selectedContact as number,
      contactId: selectedContact || undefined,
      content: messageContent,
      channel: channel,
      isInbound: false,
      // sentAt is handled by the server
    };

    sendMessageMutation.mutate(messageData);
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Messages</h1>

      {/* System Contact Info - More subtle presentation */}
      <div className="text-sm text-muted-foreground mb-6">
        {(systemConfig?.emailAddress || systemConfig?.phoneNumber) ? (
          <p>
            System Contact: {' '}
            {systemConfig.emailAddress && (
              <button
                onClick={() => copyToClipboard(systemConfig.emailAddress)}
                className="font-mono hover:text-primary cursor-pointer"
                title="Click to copy email"
              >
                {systemConfig.emailAddress}
              </button>
            )}
            {systemConfig.emailAddress && systemConfig.phoneNumber && ' • '}
            {systemConfig.phoneNumber && (
              <a
                href={`tel:${systemConfig.phoneNumber}`}
                className="font-mono hover:text-primary"
                title="Click to call"
              >
                {systemConfig.phoneNumber}
              </a>
            )}
          </p>
        ) : (
          <p>
            No system contact methods configured. 
            <Link href="/profile">
              <a className="text-primary hover:underline ml-1">
                Configure in Profile Settings
              </a>
            </Link>
          </p>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {contacts?.map((contact) => (
                  <Button
                    key={contact.id}
                    variant={selectedContact === contact.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedContact(contact.id)}
                  >
                    {contact.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-8">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle>
                {selectedContact
                  ? contacts?.find(c => c.id === selectedContact)?.name
                  : "Select a contact"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4">
                {displayMessages?.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isInbound ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[70%] ${
                        message.isInbound
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-primary text-primary-foreground"
                        }`}
                    >
                      {/* Channel indicator */}
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs capitalize font-semibold">
                          {message.channel}
                        </span>
                        <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${
                          message.status === 'delivered' ? 'bg-green-200 text-green-800' : 
                          message.status === 'read' ? 'bg-blue-200 text-blue-800' :
                          message.status === 'failed' ? 'bg-red-200 text-red-800' : 
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {message.status}
                        </span>
                      </div>
                      
                      {/* Message content */}
                      <p>{message.content}</p>
                      
                      {/* Message timestamp */}
                      <p className="text-xs opacity-70 mt-1">
                        {format(new Date(message.sentAt), "PPp")}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Loading state */}
                {(messagesLoading || contactMessagesLoading) && (
                  <div className="flex justify-center py-4">
                    <p className="text-sm text-muted-foreground">Loading messages...</p>
                  </div>
                )}
                
                {/* Empty state */}
                {!messagesLoading && !contactMessagesLoading && 
                 (!displayMessages || displayMessages.length === 0) && (
                  <div className="flex justify-center py-8">
                    <p className="text-muted-foreground">No messages found</p>
                  </div>
                )}
              </div>

              {(user?.userType === "survivor" || selectedContact) && (
                <div className="mt-4 space-y-2">
                  {/* Channel selector */}
                  <div className="flex gap-2">
                    <Select
                      value={channel}
                      onValueChange={setChannel}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Message input */}
                  <div className="flex gap-2">
                    <Textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1"
                    />
                    <Button 
                      onClick={sendMessage}
                      disabled={!messageContent.trim() || sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}