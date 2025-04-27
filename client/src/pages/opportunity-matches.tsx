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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuthCheck from "@/components/auth-check";
import PageHeader from "@/components/page-header";
import OpportunityMatchTable from "@/components/funding/opportunity-match-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";

interface OpportunityMatchWithDetails {
  id: number;
  opportunityId: number;
  survivorId: number;
  status: string;
  matchScore: string;
  matchCriteria: any;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastCheckedAt: Date;
  
  // Additional properties from joined tables
  opportunityName: string;
  survivorName: string;
  awardAmount: number | null;
  applicationEndDate: Date | null;
}

export default function OpportunityMatches() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: matches, isLoading, error } = useQuery<OpportunityMatchWithDetails[]>({
    queryKey: ["/api/matching/matches"],
    queryFn: async () => {
      const res = await fetch("/api/matching/matches");
      if (!res.ok) {
        throw new Error("Failed to fetch matches");
      }
      return res.json();
    },
  });
  
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
    },
    onError: (error) => {
      toast({
        title: "Matching process failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Filter matches based on search term
  const filteredMatches = matches?.filter(match => {
    if (!searchTerm) return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    return (
      match.opportunityName.toLowerCase().includes(searchTermLower) ||
      match.survivorName.toLowerCase().includes(searchTermLower) ||
      match.status.toLowerCase().includes(searchTermLower)
    );
  }) || [];
  
  // Group matches by status for tab display
  const pendingMatches = filteredMatches.filter(m => m.status === "pending");
  const notifiedMatches = filteredMatches.filter(m => m.status === "notified");
  const appliedMatches = filteredMatches.filter(m => m.status === "applied");
  const completedMatches = filteredMatches.filter(m => 
    m.status === "approved" || m.status === "rejected"
  );
  
  return (
    <AuthCheck>
      <div className="container py-6 space-y-6 max-w-6xl">
        <PageHeader
          title="Opportunity Matches"
          description="Manage matches between clients and funding opportunities based on eligibility"
        />
        
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Match Management</CardTitle>
                <CardDescription>
                  View and manage matches between clients and funding opportunities
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => runMatchingMutation.mutate()}
                  disabled={runMatchingMutation.isPending}
                  className="whitespace-nowrap"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${runMatchingMutation.isPending ? 'animate-spin' : ''}`} />
                  Run Matching Process
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="w-full md:w-1/3">
                  <Label htmlFor="search" className="sr-only">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search matches..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {matches && (
                    <span>
                      Found {matches.length} potential matches
                    </span>
                  )}
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="p-4 text-destructive">
                  Error loading matches: {error instanceof Error ? error.message : "Unknown error"}
                </div>
              ) : (
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="mb-4 w-full grid grid-cols-4">
                    <TabsTrigger value="pending" className="relative">
                      Pending
                      {pendingMatches.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {pendingMatches.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="notified" className="relative">
                      Notified
                      {notifiedMatches.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {notifiedMatches.length}
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
                    <TabsTrigger value="completed" className="relative">
                      Completed
                      {completedMatches.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {completedMatches.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="pending">
                    <OpportunityMatchTable matches={pendingMatches} />
                  </TabsContent>
                  
                  <TabsContent value="notified">
                    <OpportunityMatchTable matches={notifiedMatches} />
                  </TabsContent>
                  
                  <TabsContent value="applied">
                    <OpportunityMatchTable matches={appliedMatches} />
                  </TabsContent>
                  
                  <TabsContent value="completed">
                    <OpportunityMatchTable matches={completedMatches} />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="border-t px-6 py-4">
            <div className="flex flex-col w-full space-y-2">
              <div className="text-xs text-muted-foreground">
                <p>
                  Matching runs automatically every 30 minutes to check for new eligible matches.
                  You can also manually run the matching process using the button above.
                </p>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AuthCheck>
  );
}