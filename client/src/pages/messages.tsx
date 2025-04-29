import React, { useState, useEffect } from "react";
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
  BellRing,
  Tag,
  X,
  Filter
} from "lucide-react";
import { TagFilter } from "@/components/messages/message-tags";
import { parseTags, formatTags } from "@/utils/message-tagging";

export default function Messages() {
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [channel, setChannel] = useState<string>("email");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
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
    queryKey: ['/api/messages/filter', { contactId: selectedContact }],
    queryFn: ({ queryKey }) => {
      // Only perform the query if contact is selected and user is a practitioner
      if (selectedContact && user?.userType === "practitioner") {
        // Properly construct the URL with the contact ID
        const url = `/api/messages/filter?contactId=${selectedContact}`;
        return fetch(url).then(res => {
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
      tags?: string;
      organizationId?: number;
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
          queryKey: ['/api/messages/filter', { contactId: selectedContact }]
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

  // Get user's organization if they are a practitioner
  const { data: userOrgs } = useQuery({
    queryKey: ["/api/practitioners/organizations", { userId: user?.id }],
    enabled: user?.userType === "practitioner",
  });

  // Select organization to send as (first one by default)
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null);
  
  // Set the selected organization when data is loaded
  useEffect(() => {
    if (userOrgs && userOrgs.length > 0 && !selectedOrg) {
      setSelectedOrg(userOrgs[0].id);
    }
  }, [userOrgs, selectedOrg]);

  // Function to add/remove tags
  const handleTagSelect = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleTagRemove = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };
  
  // Add tag filter functions
  const handleFilterTagSelect = (tag: string) => {
    if (!filterTags.includes(tag)) {
      setFilterTags([...filterTags, tag]);
    }
  };

  const handleFilterTagRemove = (tag: string) => {
    setFilterTags(filterTags.filter(t => t !== tag));
  };

  // Send a message
  async function sendMessage() {
    if (!messageContent.trim()) return;

    // Format the tags as a comma-separated string
    const formattedTags = selectedTags.length > 0 ? formatTags(selectedTags) : undefined;
    
    const messageData = {
      survivorId: user?.userType === "survivor" ? user.id : selectedContact as number,
      contactId: selectedContact || undefined,
      content: messageContent,
      channel: channel,
      isInbound: false,
      tags: formattedTags,
      organizationId: user?.userType === "practitioner" ? selectedOrg : undefined,
    };

    try {
      await sendMessageMutation.mutateAsync(messageData);
      
      // Reset tags after sending
      setSelectedTags([]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
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
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        
        {/* System Contact Info - Minimal top-right placement */}
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
                </button>
              )}
              {systemConfig.phoneNumber && (
                <a
                  href={`tel:${systemConfig.phoneNumber}`}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                  title="Click to call"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          ) : (
            <Link 
              className="text-primary hover:underline text-sm flex items-center gap-1"
              href="/profile"
              title="Configure contact info"
            >
              <BellRing className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* iPhone-like messaging UI */}
      <Card className="shadow-sm overflow-hidden max-w-3xl mx-auto">
        {/* "To:" field at the top to replace contacts sidebar */}
        <div className="bg-muted/40 px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2 w-8">To:</span>
              <Select
                value={selectedContact ? selectedContact.toString() : ""}
                onValueChange={(value) => setSelectedContact(Number(value))}
              >
                <SelectTrigger className="border-0 bg-transparent hover:bg-muted focus:ring-0 shadow-none h-8 font-normal focus:text-foreground">
                  <SelectValue placeholder="Select a contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts?.map(contact => (
                    <SelectItem 
                      key={contact.id} 
                      value={contact.id.toString()}
                      className="font-normal"
                    >
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Filter toggle button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} className="mr-1" />
              Filter
            </Button>
          </div>
          
          {/* Filter panel */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t">
              <h3 className="text-sm font-medium mb-2">Filter Messages By:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <TagFilter
                    selectedTags={filterTags}
                    onTagSelect={handleFilterTagSelect}
                    onTagRemove={handleFilterTagRemove}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
            {/* Date header - group messages by date */}
            {displayMessages?.length > 0 && (
              <div className="flex justify-center mb-2">
                <div className="bg-muted px-3 py-1 rounded-full">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(displayMessages[0].sentAt), "MMMM d, yyyy")}
                  </span>
                </div>
              </div>
            )}
            
            {displayMessages?.map((message, index) => {
              // Check if this is a new day compared to previous message
              const showDateSeparator = index > 0 && 
                new Date(message.sentAt).toDateString() !== 
                new Date(displayMessages[index-1].sentAt).toDateString();
              
              // Determine if this message is part of a sequence from the same sender
              const isSequence = index > 0 && 
                message.isInbound === displayMessages[index-1].isInbound;
                
              return (
                <React.Fragment key={message.id}>
                  {/* Show date separator if needed */}
                  {showDateSeparator && (
                    <div className="flex justify-center my-4">
                      <div className="bg-muted px-3 py-1 rounded-full">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.sentAt), "MMMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div
                    className={`flex ${message.isInbound ? "justify-start" : "justify-end"} ${
                      isSequence ? "mt-1" : "mt-4"
                    }`}
                  >
                    <div
                      className={`px-3.5 py-2.5 max-w-[80%] ${
                        message.isInbound
                          ? "bg-muted rounded-t-xl rounded-br-xl rounded-bl-sm text-foreground"
                          : "bg-primary rounded-t-xl rounded-bl-xl rounded-br-sm text-primary-foreground"
                        }`}
                    >
                      {/* Channel as a small label above iPhone-style */}
                      {!isSequence && (
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] uppercase tracking-wide opacity-60">
                            {message.channel}
                          </span>
                          <span className={`text-[10px] ml-2 opacity-60 ${
                            message.status === 'delivered' ? 'text-green-500' : 
                            message.status === 'read' ? 'text-blue-500' :
                            message.status === 'failed' ? 'text-red-500' : 
                            ''
                          }`}>
                            {message.status}
                          </span>
                        </div>
                      )}
                      
                      {/* Organization sender info for outbound messages */}
                      {!message.isInbound && message.organizationId && (
                        <div className="flex items-center gap-1 text-xs mb-1 opacity-70">
                          <Building2 size={12} />
                          <span>
                            {userOrgs?.find(org => org.id === message.organizationId)?.name || 'Organization'}
                          </span>
                        </div>
                      )}
                      
                      {/* Message content with better typography */}
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      
                      {/* Tags */}
                      {message.tags && (
                        <div className="mt-1.5">
                          <TagFilter 
                            selectedTags={parseTags(message.tags)} 
                            onTagSelect={() => {}} 
                            onTagRemove={() => {}}
                          />
                        </div>
                      )}
                      
                      {/* Message timestamp iPhone-style */}
                      <p className="text-[9px] opacity-60 mt-1 text-right">
                        {format(new Date(message.sentAt), "h:mm a")}
                      </p>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            
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
                      placeholder="Write your email message..."
                      className="min-h-[120px] border-0 focus-visible:ring-0 shadow-none resize-none"
                    />
                    <div className="flex justify-between items-center mt-3">
                      {/* Organization selector for practitioners */}
                      {user?.userType === "practitioner" && userOrgs && userOrgs.length > 0 && (
                        <Select
                          value={selectedOrg?.toString() || ""}
                          onValueChange={(value) => setSelectedOrg(Number(value))}
                        >
                          <SelectTrigger className="h-8 text-xs border-dashed">
                            <Building2 className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                            <SelectValue placeholder="Send as..." />
                          </SelectTrigger>
                          <SelectContent>
                            {userOrgs.map(org => (
                              <SelectItem 
                                key={org.id} 
                                value={org.id.toString()}
                                className="text-xs"
                              >
                                Send as {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {/* Tag selector */}
                      <div className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <TagFilter
                          selectedTags={selectedTags}
                          onTagSelect={handleTagSelect}
                          onTagRemove={handleTagRemove}
                        />
                      </div>
                      
                      <Button 
                        onClick={sendMessage}
                        disabled={!messageContent.trim() || sendMessageMutation.isPending}
                        size="sm"
                      >
                        {sendMessageMutation.isPending ? "Sending..." : "Send Email"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {channel === "sms" && (
                <div className="border rounded-md bg-card">
                  <div className="p-3">
                    <Textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Type your SMS message..."
                      className="min-h-[80px] border-0 focus-visible:ring-0 shadow-none resize-none"
                    />
                    <div className="flex justify-between items-center mt-3">
                      <div className="text-xs text-muted-foreground">
                        {messageContent.length} / 160 characters
                      </div>
                      <Button 
                        onClick={sendMessage}
                        disabled={!messageContent.trim() || sendMessageMutation.isPending}
                        size="sm"
                        className="rounded-full"
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        {sendMessageMutation.isPending ? "Sending..." : "Send SMS"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {channel === "call" && (
                <div className="border rounded-md bg-card">
                  <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Call Log</span>
                    </div>
                    <Badge variant="outline" className="text-xs">In Progress</Badge>
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
                        className="rounded-full h-9 w-9 p-0"
                        variant="destructive"
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
  );
}