import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  UserCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { SurvivorData as ClientContextSurvivorData } from '@/hooks/use-client-context';
import { useClient, SurvivorData } from '@/contexts/client-context';

export default function AllClientsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { setCurrentClient } = useClient();
  const [searchQuery, setSearchQuery] = useState('');

  // Define extended client type with additional fields
  interface ExtendedClient extends SurvivorData {
    practitionerId?: number;
    status?: string;
    [key: string]: any; // Allow for additional properties
  }

  // Fetch all clients (survivors)
  const { data: clientsData = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/survivors'],
    enabled: !!user,
  });
  
  // Cast to our extended type with necessary properties
  const clients = clientsData as ExtendedClient[];

  // Fetch practitioners for assignment data
  const { data: practitioners = [] } = useQuery<any[]>({
    queryKey: ['/api/practitioners/organizations'],
    enabled: !!user && user.role === 'org_admin',
  });

  // Filter clients based on search query
  const filteredClients = clients.filter((client) => {
    const fullName = 
      `${client.firstName || ''} ${client.lastName || ''}`.trim() || 
      client.name || 
      '';
    
    return fullName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Function to get practitioner name by ID
  const getPractitionerName = (practitionerId: number) => {
    const practitioner = practitioners.find((p: any) => p.id === practitionerId);
    return practitioner ? practitioner.name : 'Unassigned';
  };

  // Function to view client
  const handleViewClient = (client: ExtendedClient) => {
    // Convert ExtendedClient to the format that setCurrentClient expects
    const clientForContext: SurvivorData = {
      id: client.id,
      name: client.name,
      username: client.username || undefined,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      userType: client.userType,
      role: client.role,
      organizationId: client.organizationId,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    };
    
    // Set the current client in context
    setCurrentClient(clientForContext);
    
    // Navigate to household page to view client data
    window.location.href = '/household';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">All Clients</h1>
        <Link href="/add-client">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Client List</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading clients...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <p>No clients found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                        {client.firstName && client.lastName
                          ? `${client.firstName} ${client.lastName}`
                          : client.name || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {client.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {client.practitionerId 
                        ? getPractitionerName(client.practitionerId)
                        : 'Unassigned'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewClient(client)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Client
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}