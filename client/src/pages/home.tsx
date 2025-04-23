import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, DollarSign, CheckSquare, Shield, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, Document, CapitalSource, SystemConfig } from "@shared/schema";

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

// Initial tasks for Stage S
const initialTasks = [
  { id: 1, text: "Locate safe temporary shelter", completed: false, urgent: true, stage: "S" },
  { id: 2, text: "Register with FEMA", completed: false, urgent: true, stage: "S" },
  { id: 3, text: "Address immediate medical needs", completed: false, urgent: true, stage: "S" },
  { id: 4, text: "Secure food and water supply", completed: false, urgent: true, stage: "S" }
];

export default function Home() {
  const [currentMessage] = useState(getRandomMessage());
  const [timestamp, setTimestamp] = useState(new Date().getTime());
  const { toast } = useToast();
  
  // Function to force refresh the task data
  const refreshTaskData = useCallback(() => {
    setTimestamp(new Date().getTime());
  }, []);
  
  // Add an effect to refresh tasks data when component mounts
  useEffect(() => {
    refreshTaskData();
    
    // Also set up an interval to refresh every 5 seconds
    const interval = setInterval(refreshTaskData, 5000);
    return () => clearInterval(interval);
  }, [refreshTaskData]);

  // Get current stage from the API
  const { data: systemConfig } = useQuery<SystemConfig>({
    queryKey: ["/api/system/config"],
  });

  const currentStage = systemConfig?.stage || "S";

  // Get tasks from the API
  const { data: tasks = [], refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ["/api/action-plan/tasks", timestamp],
    staleTime: 0, // Always check for fresh data
    refetchOnWindowFocus: true, // Refetch when the window regains focus
    refetchOnMount: true, // Always refetch when the component mounts
  });
  
  // Initialize tasks mutation - creates default tasks if none exist
  const initializeTasksMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/action-plan/initialize-tasks");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tasks initialized",
        description: "Default recovery tasks have been created for you",
      });
      refetchTasks(); // Refetch tasks after initialization
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to initialize tasks",
      });
    }
  });
  
  // If no tasks exist in the database, initialize them - only once per session
  useEffect(() => {
    // Create a flag in session storage to track initialization
    const tasksInitialized = sessionStorage.getItem('tasksInitialized');
    
    if (tasks.length === 0 && !tasksInitialized) {
      initializeTasksMutation.mutate();
      // Mark as initialized
      sessionStorage.setItem('tasksInitialized', 'true');
    }
  }, [tasks.length]);

  // Map the system config stage value to the task stage value
  const stageMappings = {
    "S": "secure_stabilize",
    "T": "take_stock",
    "A": "align_recovery",
    "R": "rebuild_restore",
    "T2": "transition_normal"
  };
  
  const mappedStage = stageMappings[currentStage as keyof typeof stageMappings] || "secure_stabilize";
  
  // Calculate task counts for the current stage
  const stageTasks = tasks.filter(task => task.stage === mappedStage);
  // Count tasks that are marked as completed
  const completedTaskCount = stageTasks.filter(task => task.completed).length;
  // Always set the total count based on the actual number of tasks in the current stage
  const totalTaskCount = stageTasks.length;
  // Calculate remaining tasks
  const remainingTaskCount = totalTaskCount - completedTaskCount;
  // Calculate progress percentage
  const progressPercentage = totalTaskCount > 0 
    ? Math.round((completedTaskCount / totalTaskCount) * 100) 
    : 0;
    
  // Log task information for debugging
  console.log('Task Data:', {
    stage: mappedStage,
    allTasks: tasks.length,
    stageTasks: stageTasks.length,
    completed: completedTaskCount,
    remaining: remainingTaskCount,
    progress: progressPercentage
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: fundingOpportunities = [] } = useQuery<CapitalSource[]>({
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
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20"
                onClick={() => {
                  refetchTasks();
                  toast({
                    title: "Tasks refreshed",
                    description: "The task data has been updated.",
                    duration: 2000,
                  });
                }}
                title="Refresh task data"
              >
                <RefreshCw className="h-4 w-4 text-primary" />
              </Button>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl font-bold">
                {remainingTaskCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Remaining tasks in Stage {currentStage}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-in-out" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completedTaskCount} completed</span>
                <span>{totalTaskCount} total</span>
              </div>
            </div>

            <Link href="/action-plan">
              <Button variant="link" className="p-0 h-auto text-xs font-medium">
                View & Manage Tasks →
              </Button>
            </Link>
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
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl font-bold">{fundingOpportunities.length}</div>
              <p className="text-xs text-muted-foreground">
                Available grant applications
              </p>
            </div>
            <Link href="/capital-sources#opportunities">
              <Button variant="link" className="p-0 h-auto text-xs font-medium">View Opportunities →</Button>
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
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl font-bold">{documents.length}</div>
              <p className="text-xs text-muted-foreground">
                Uploaded documents
              </p>
            </div>
            <Link href="/documents">
              <Button variant="link" className="p-0 h-auto text-xs font-medium">View Documents →</Button>
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
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">
                Stay connected with your support team and get updates on your recovery progress.
              </div>
            </div>
            <Link href="/messages">
              <Button variant="link" className="p-0 h-auto text-xs font-medium">View Message Center →</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}