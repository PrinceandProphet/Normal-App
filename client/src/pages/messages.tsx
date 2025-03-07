import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Messages() {
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const { toast } = useToast();

  const { data: contacts } = useQuery({
    queryKey: ["/api/contacts"],
  });

  const { data: systemConfig } = useQuery({
    queryKey: ["/api/system/config"],
  });

  const { data: messages } = useQuery({
    queryKey: ["/api/contacts", selectedContact, "messages"],
    enabled: selectedContact !== null,
  });

  async function sendMessage() {
    if (!selectedContact || !messageContent.trim()) return;

    try {
      await apiRequest("POST", "/api/messages", {
        contactId: selectedContact,
        content: messageContent,
        type: "email",
        isInbound: false,
        timestamp: new Date(),
      });

      queryClient.invalidateQueries({ 
        queryKey: ["/api/contacts", selectedContact, "messages"]
      });
      setMessageContent("");
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message",
      });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Messages</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>System Email</CardTitle>
        </CardHeader>
        <CardContent>
          {systemConfig?.emailAddress ? (
            <p className="font-mono bg-muted p-2 rounded">
              {systemConfig.emailAddress}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No system email configured. 
              <Link href="/profile">
                <a className="text-primary hover:underline ml-1">
                  Configure in Profile Settings
                </a>
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

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
                {messages?.map((message) => (
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
                      <p>{message.content}</p>
                      <p className="text-xs opacity-70">
                        {format(new Date(message.timestamp), "PPp")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedContact && (
                <div className="mt-4 flex gap-2">
                  <Textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                  />
                  <Button onClick={sendMessage}>Send</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}