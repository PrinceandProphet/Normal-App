import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuthCheck from "@/components/auth-check";
import PageHeader from "@/components/page-header";
import EnhancedOpportunityMatchTable from "@/components/funding/enhanced-opportunity-match-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { RefreshCw, Loader2, Search, Filter } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useClientContext } from "@/hooks/use-client-context";

interface OpportunityMatchWithDetails {
  id: number;
  opportunityId: number;
  survivorId: number;
  status: string;
  matchScore: string;
  matchCriteria: any;
  notes: string | null;
  awardAmount: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  lastCheckedAt: string | Date;
  
  // Application tracking fields
  appliedAt?: Date | null;
  appliedById?: number | null;
  awardedAt?: Date | null;
  awardedById?: number | null;
  fundedAt?: Date | null;
  fundedById?: number | null;
  
  // Additional properties from joined tables
  opportunityName: string;
  survivorName: string;
  applicationEndDate: string | Date | null;
}

export default function OpportunityMatches() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedClient } = useClientContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Function to trigger a refresh of data
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  const { data: matches, isLoading, error, refetch } = useQuery<OpportunityMatchWithDetails[]>({
    queryKey: ["/api/matching/matches", refreshTrigger],
    queryFn: async () => {
      const res = await fetch("/api/matching/matches");
      if (!res.ok) {
        throw new Error("Failed to fetch matches");
      }
      return res.json();
    },
  });
  
  // Data for client specific matches when using "View As" functionality
  const { data: clientMatches, isLoading: clientMatchesLoading } = useQuery<OpportunityMatchWithDetails[]>({
    queryKey: ["/api/matching/survivors", selectedClient?.id, "matches", refreshTrigger],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const res = await apiRequest("GET", `/api/matching/survivors/${selectedClient.id}/matches`);
      return await res.json();
    },
    enabled: !!selectedClient?.id,
  });
  
  // Decide which matches to use based on "View As" context
  const displayMatches = selectedClient ? clientMatches || [] : matches || [];
  
  const runMatchingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/matching/run", {});
      
      // Check if the response status is OK
      if (!res.ok) {
        throw new Error("Failed to run matching process");
      }
      
      // Handle potential JSON parsing errors
      try {
        return await res.json();
      } catch (err) {
        // If response is not JSON, return a default object
        return { success: true, newMatchCount: 0 };
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Matching process complete",
        description: `Found ${data.newMatchCount || 0} new potential matches.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matching/matches"] });
      refreshData();
    },
    onError: (error) => {
      toast({
        title: "Matching process failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Filter matches based on search term and status
  const filteredMatches = displayMatches.filter(match => {
    // First filter by search term
    const searchMatch = !searchTerm || 
      match.opportunityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.survivorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Then filter by status if not "all"
    const statusMatch = statusFilter === "all" || match.status === statusFilter;
    
    // Hide archived matches unless specifically requested
    const archivedMatch = statusFilter === "archived" || match.status !== "archived";
    
    return searchMatch && statusMatch && archivedMatch;
  });
  
  // Group matches by status for tab display
  const pendingMatches = filteredMatches.filter(m => m.status === "pending");
  const appliedMatches = filteredMatches.filter(m => m.status === "applied");
  const awardedMatches = filteredMatches.filter(m => m.status === "awarded");
  const fundedMatches = filteredMatches.filter(m => m.status === "funded");
  const archivedMatches = filteredMatches.filter(m => m.status === "archived");
  
  // Handle the "View As" badge display
  const TitleWithBadge = () => (
    <div className="flex flex-col">
      <h1 className="text-2xl font-bold">Opportunity Matches</h1>
      {selectedClient && (
        <p className="text-sm text-primary font-medium mt-1">
          Viewing matches for {selectedClient.name}
        </p>
      )}
    </div>
  );
  
  return (
    <AuthCheck>
      <div className="container py-6 space-y-6 max-w-6xl">
        <PageHeader
          title={<TitleWithBadge />}
          description="Manage client grant applications and funding opportunities"
        />
        
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Grant Applications</CardTitle>
                <CardDescription>
                  Track and manage applications through the approval process
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                {!selectedClient && (
                  <Button
                    onClick={() => runMatchingMutation.mutate()}
                    disabled={runMatchingMutation.isPending}
                    className="whitespace-nowrap"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${runMatchingMutation.isPending ? 'animate-spin' : ''}`} />
                    Run Matching Process
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="w-full md:w-1/3 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by client or opportunity..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-[180px]">
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="h-9">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="awarded">Awarded</SelectItem>
                        <SelectItem value="funded">Funded</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {displayMatches && (
                      <span>
                        {filteredMatches.length} of {displayMatches.length} matches
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {isLoading || clientMatchesLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="p-4 text-destructive">
                  Error loading matches: {error instanceof Error ? error.message : "Unknown error"}
                </div>
              ) : (
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="mb-4 w-full grid grid-cols-6">
                    <TabsTrigger value="all" className="relative">
                      All
                      {filteredMatches.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {filteredMatches.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="relative">
                      Pending
                      {pendingMatches.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {pendingMatches.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="applied" className="relative">
                      Applied
                      {appliedMatches.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {appliedMatches.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="awarded" className="relative">
                      Awarded
                      {awardedMatches.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {awardedMatches.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="funded" className="relative">
                      Funded
                      {fundedMatches.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {fundedMatches.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="relative">
                      Archived
                      {archivedMatches.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {archivedMatches.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all">
                    <EnhancedOpportunityMatchTable 
                      matches={filteredMatches} 
                      isSurvivorView={!!selectedClient}
                      onRefresh={refreshData}
                    />
                  </TabsContent>
                  
                  <TabsContent value="pending">
                    <EnhancedOpportunityMatchTable 
                      matches={pendingMatches} 
                      isSurvivorView={!!selectedClient}
                      onRefresh={refreshData}
                    />
                  </TabsContent>
                  
                  <TabsContent value="applied">
                    <EnhancedOpportunityMatchTable 
                      matches={appliedMatches} 
                      isSurvivorView={!!selectedClient}
                      onRefresh={refreshData}
                    />
                  </TabsContent>
                  
                  <TabsContent value="awarded">
                    <EnhancedOpportunityMatchTable 
                      matches={awardedMatches} 
                      isSurvivorView={!!selectedClient}
                      onRefresh={refreshData}
                    />
                  </TabsContent>
                  
                  <TabsContent value="funded">
                    <EnhancedOpportunityMatchTable 
                      matches={fundedMatches} 
                      isSurvivorView={!!selectedClient}
                      onRefresh={refreshData}
                    />
                  </TabsContent>
                  
                  <TabsContent value="archived">
                    <EnhancedOpportunityMatchTable 
                      matches={archivedMatches} 
                      isSurvivorView={!!selectedClient}
                      onRefresh={refreshData}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="border-t px-6 py-4">
            <div className="flex flex-col w-full space-y-2">
              <div className="text-xs text-muted-foreground">
                <p>
                  {selectedClient 
                    ? "View and manage grant applications for this client. Use the status tabs to filter applications."
                    : "Matching runs automatically every 30 minutes to check for new eligible matches. You can also manually run the matching process using the button above."
                  }
                </p>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AuthCheck>
  );
}