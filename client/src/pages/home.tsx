import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, DollarSign, CheckSquare, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

// Sample encouraging messages
const encouragingMessages = [
  "Every step forward matters, no matter how small.",
  "You're not alone in this journey.",
  "Progress takes time, and you're making it happen.",
  "Your resilience is inspiring.",
  "Focus on today's progress, tomorrow will follow.",
  "Small actions lead to big changes.",
];

const getRandomMessage = () => {
  const randomIndex = Math.floor(Math.random() * encouragingMessages.length);
  return encouragingMessages[randomIndex];
};

export default function Home() {
  const [currentMessage] = useState(getRandomMessage());
  const { toast } = useToast();

  // Get current stage from the API
  const { data: systemConfig } = useQuery({
    queryKey: ["/api/system/config"],
  });

  const currentStage = systemConfig?.stage || "S";

  // Get tasks from the API
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/action-plan/tasks"],
  });

  // Filter tasks for current stage
  const currentStageTasks = tasks.filter(task => task.stage === currentStage);

  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents"],
  });

  const { data: fundingOpportunities = [] } = useQuery({
    queryKey: ["/api/capital-sources"],
  });

  const stageName = 
    currentStage === "S" ? "Secure & Stabilize" :
    currentStage === "T" ? "Take Stock & Track" :
    currentStage === "A" ? "Align Recovery Plan" :
    currentStage === "R" ? "Rebuild & Restore" :
    "Transition to Normal";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
          Disaster Planning Dashboard
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Manage your checklists, explore funding opportunities, and organize important documents all in one place.
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-none">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Recovery Progress</h2>
              </div>
              <p className="text-3xl font-bold text-primary">
                Stage {currentStage}: {stageName}
              </p>
              <p className="text-base italic text-muted-foreground">
                "{currentMessage}"
              </p>
            </div>
            <Link href="/action-plan">
              <Button className="shadow-lg bg-gradient-to-r from-primary to-primary/90">
                View Full Action Plan
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* To Do's Card */}
        <Card className="backdrop-blur-sm bg-white/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">To Do's</CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckSquare className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {currentStageTasks.length}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Tasks in Stage {currentStage}
            </p>
            <p className="text-xs text-muted-foreground mt-4 italic">
              Coming soon: Interactive task management directly from your dashboard
            </p>
          </CardContent>
        </Card>

        {/* Funding Opportunities Card */}
        <Card className="backdrop-blur-sm bg-white/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Funding Opportunities</CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{fundingOpportunities.length}</div>
            <p className="text-xs text-muted-foreground mb-2">
              Available grant applications
            </p>
            <Link href="/capital-sources#opportunities">
              <Button variant="link" className="px-0 font-medium">View Opportunities →</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Documents Card */}
        <Card className="backdrop-blur-sm bg-white/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{documents.length}</div>
            <p className="text-xs text-muted-foreground mb-2">
              Uploaded documents
            </p>
            <Link href="/documents">
              <Button variant="link" className="px-0 font-medium">View Documents →</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/documents">
              <Button className="w-full shadow-lg bg-gradient-to-r from-primary to-primary/90">
                Upload New Document
              </Button>
            </Link>
            <Link href="/capital-sources">
              <Button variant="outline" className="w-full border-2">
                Browse Funding Opportunities
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Latest Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/messages">
              <Button variant="link" className="px-0 font-medium">View Message Center →</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}