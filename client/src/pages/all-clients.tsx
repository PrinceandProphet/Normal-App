import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { UserPlus, Users, ArrowUpRight, Search, Filter } from "lucide-react";
import { Link } from "wouter";
import { useClientContext } from "@/hooks/use-client-context";

export default function AllClients() {
  const { user } = useAuth();
  const { setSelectedClient } = useClientContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  interface ExtendedClient {
    id: number;
    name: string;
    email?: string;
    phoneNumber?: string;
    status?: string;
    practitionerId?: number;
    practitionerName?: string;
    createdAt?: string;
    [key: string]: any; // Allow for additional properties
  }

  // Get all organization clients/survivors
  const {
    data: clients = [],
    isLoading: clientsLoading,
    error: clientsError
  } = useQuery<ExtendedClient[]>({
    queryKey: ["/api/survivors", { organizationId: user?.organizationId }],
    enabled: !!user?.organizationId,
  });

  // Get practitioners for practitioner names
  const { 
    data: practitioners = [],
    isLoading: practitionersLoading
  } = useQuery<any[]>({
    queryKey: ["/api/organizations/practitioners", { organizationId: user?.organizationId }],
    enabled: !!user?.organizationId,
  });

  // Apply practitioner names to clients
  const clientsWithPractitioners = clients.map((client) => {
    if (client.practitionerId) {
      const practitioner = practitioners.find(p => p.id === client.practitionerId);
      return {
        ...client,
        practitionerName: practitioner ? practitioner.name : "Unassigned"
      };
    }
    return {
      ...client,
      practitionerName: "Unassigned"
    };
  });

  // Filter and search clients
  const filteredClients = clientsWithPractitioners.filter((client) => {
    const matchesSearch = 
      !searchQuery || 
      client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.practitionerName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      !filterStatus || 
      (client.status === filterStatus);
    
    return matchesSearch && matchesFilter;
  });

  // Handle selecting a client to view
  const handleViewClient = (client: ExtendedClient) => {
    // Set the selected client in context for other components to use
    if (client.id) {
      // We need to query for the full client data before setting it in context
      // For now, we'll navigate to the client page directly
      // The client page will handle loading the full client data
      console.log(`Viewing client: ${client.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Clients</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all clients in your organization
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/add-client">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Client
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Client Management</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredClients.length} {filteredClients.length === 1 ? "client" : "clients"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setFilterStatus(filterStatus ? null : "active")}>
              <Filter className="h-4 w-4 mr-2" />
              {filterStatus ? `Filtering: ${filterStatus}` : "Filter"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clientsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : clientsError ? (
            <div className="text-center py-8 text-red-500">
              <p>Error loading clients. Please try again.</p>
            </div>
          ) : filteredClients.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{client.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {client.email && <div>{client.email}</div>}
                          {client.phoneNumber && <div className="text-muted-foreground">{client.phoneNumber}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.status === "active" ? "default" : "outline"}>
                          {client.status || "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {practitionersLoading ? (
                          <span className="text-muted-foreground">Loading...</span>
                        ) : (
                          <span>{client.practitionerName}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          onClick={() => handleViewClient(client)}
                        >
                          <Link href={`/clients/${client.id}`}>
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground mb-6">No clients found</p>
              <Button asChild>
                <Link href="/add-client">Add Your First Client</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}