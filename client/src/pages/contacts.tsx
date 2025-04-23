import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, Phone, Mail, Plus, Trash2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema } from "@shared/schema";
import type { InsertContact, Contact } from "@shared/schema";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      isEmergency: false,
    },
  });

  const filteredContacts = contacts?.filter(contact => 
    contact.name.toLowerCase().includes(search.toLowerCase()) ||
    contact.email?.toLowerCase().includes(search.toLowerCase()) ||
    contact.phone?.includes(search)
  );

  async function onSubmit(values: InsertContact) {
    try {
      await apiRequest("POST", "/api/contacts", values);
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Success",
        description: "Contact added successfully",
      });
      form.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add contact",
      });
    }
  }

  async function deleteContact(id: number) {
    try {
      await apiRequest("DELETE", `/api/contacts/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete contact",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isEmergency"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Emergency Contact</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit">Add Contact</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts?.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{contact.name}</h3>
                      {contact.isEmergency && (
                        <Badge variant="destructive">Emergency</Badge>
                      )}
                    </div>
                    {contact.email && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 mr-2" />
                        {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="h-4 w-4 mr-2" />
                        {contact.phone}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteContact(contact.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
