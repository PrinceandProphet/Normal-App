import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, DollarSign, Building } from "lucide-react";
import type { User, FundingOpportunity, Organization } from "@shared/schema";

export default function CaseManager() {
  const { toast } = useToast();

  // Fetch case manager's survivors
  const { data: survivors = [] } = useQuery<User[]>({
    queryKey: ["/api/survivors"],
  });

  // Fetch funding opportunities
  const { data: fundingOpportunities = [] } = useQuery<FundingOpportunity[]>({
    queryKey: ["/api/funding-opportunities"],
  });

  // Fetch organization details
  const { data: organization } = useQuery<Organization>({
    queryKey: ["/api/organization"],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Case Manager Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Survivors Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Survivors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-2xl font-bold">{survivors.length}</p>
              <p className="text-sm text-muted-foreground">
                Active cases under your management
              </p>
              <Button className="w-full">View All Survivors</Button>
            </div>
          </CardContent>
        </Card>

        {/* Funding Opportunities Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Funding Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-2xl font-bold">{fundingOpportunities.length}</p>
              <p className="text-sm text-muted-foreground">
                Available funding programs
              </p>
              <Button className="w-full">Manage Opportunities</Button>
            </div>
          </CardContent>
        </Card>

        {/* Organization Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-2xl font-bold">{organization?.name || "Loading..."}</p>
              <p className="text-sm text-muted-foreground">
                {organization?.type === "non_profit" ? "Non-Profit" : "For-Profit"} Organization
              </p>
              <Button className="w-full">View Details</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Activity</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">
              Activity feed coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
