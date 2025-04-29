import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Shield, Share2, FileDown, Pencil, X, Save, AlertCircle, ChevronRight, ChevronDown, UserCircle, ArrowRightCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useClientContext } from "@/hooks/use-client-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Logo } from "@/components/ui/logo";

interface SubTask {
  text: string;
  completed: boolean;
}

interface Task {
  text: string;
  completed: boolean;
  urgent: boolean;
  subtasks: SubTask[];
  expanded?: boolean;
}

interface Stage {
  letter: string;
  title: string;
  description: string;
  tasks: Task[];
}

const recoveryStages: Stage[] = [
  {
    letter: "S",
    title: "Secure & Stabilize",
    description: "Find shelter, register for aid, meet urgent medical & food needs.",
    tasks: [
      { text: "Locate safe temporary shelter", completed: false, urgent: true, subtasks: [] },
      { text: "Register with FEMA", completed: false, urgent: true, subtasks: [] },
      { text: "Address immediate medical needs", completed: false, urgent: true, subtasks: [] },
      { text: "Secure food and water supply", completed: false, urgent: true, subtasks: [] }
    ]
  },
  {
    letter: "T",
    title: "Take Stock & Track Assistance",
    description: "Document losses, apply for FEMA & insurance, secure financial relief.",
    tasks: [
      { text: "Document property damage", completed: false, urgent: true, subtasks: [] },
      { text: "File insurance claims", completed: false, urgent: true, subtasks: [] },
      { text: "Apply for FEMA assistance", completed: false, urgent: false, subtasks: [] },
      { text: "Track aid applications", completed: false, urgent: false, subtasks: [] }
    ]
  },
  {
    letter: "A",
    title: "Align Recovery Plan & Resources",
    description: "Assess long-term housing, begin repair planning, appeal denied claims.",
    tasks: [
      { text: "Evaluate long-term housing options", completed: false, urgent: false, subtasks: [] },
      { text: "Create repair/rebuild plan", completed: false, urgent: false, subtasks: [] },
      { text: "Appeal denied claims if necessary", completed: false, urgent: false, subtasks: [] },
      { text: "Identify available resources", completed: false, urgent: false, subtasks: [] }
    ]
  },
  {
    letter: "R",
    title: "Rebuild & Restore Stability",
    description: "Hire contractors, complete home repairs, secure job & financial recovery.",
    tasks: [
      { text: "Vet and hire contractors", completed: false, urgent: false, subtasks: [] },
      { text: "Oversee repairs/reconstruction", completed: false, urgent: false, subtasks: [] },
      { text: "Address employment needs", completed: false, urgent: false, subtasks: [] },
      { text: "Establish financial stability", completed: false, urgent: false, subtasks: [] }
    ]
  },
  {
    letter: "T",
    title: "Transition to Normal & Prepare for Future",
    description: "Close aid cases, submit tax claims, update emergency plans.",
    tasks: [
      { text: "Close assistance cases", completed: false, urgent: false, subtasks: [] },
      { text: "File tax-related claims", completed: false, urgent: false, subtasks: [] },
      { text: "Update emergency plans", completed: false, urgent: false, subtasks: [] },
      { text: "Document lessons learned", completed: false, urgent: false, subtasks: [] }
    ]
  }
];

// Interface for API-returned tasks
interface ApiTask {
  id: number;
  text: string;
  completed: boolean;
  urgent: boolean;
  stage: string; // S, T, A, R, T
  survivorId: number;
  subtasks?: {
    id: number;
    text: string;
    completed: boolean;
  }[];
}

export default function ActionPlan() {
  const { selectedClient } = useClientContext();
  const [editingStage, setEditingStage] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<{ stageIndex: number; taskIndex: number } | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<{ stageIndex: number; taskIndex: number; subtaskIndex: number } | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [stages, setStages] = useState(recoveryStages);
  const { toast } = useToast();
  
  // Query for system configuration to get current stage
  const { data: systemConfig } = useQuery({
    queryKey: ["/api/system/config"],
  });
  
  // Stage update mutation
  const stageMutation = useMutation({
    mutationFn: async (stage: string) => {
      const response = await apiRequest("POST", "/api/system/config/stage", { stage });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Recovery phase updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/system/config"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update recovery phase",
      });
    }
  });
  
  // Handle stage change
  const handleStageChange = (stage: string) => {
    stageMutation.mutate(stage);
  };
  
  // State to force refetching
  const [timestamp, setTimestamp] = useState(new Date().getTime());
  
  // Force refresh when client changes or when needed
  useEffect(() => {
    setTimestamp(new Date().getTime());
  }, [selectedClient]);
  
  // Query for tasks specific to the selected client with timestamp for fresh data
  const { data: clientTasks, isLoading } = useQuery<ApiTask[]>({
    queryKey: ["/api/action-plan/tasks", selectedClient?.id, timestamp],
    enabled: !!selectedClient,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  
  // Merge client tasks with the template stages when data changes
  useEffect(() => {
    if (clientTasks && selectedClient) {
      // Clone the recovery stages template
      const newStages = JSON.parse(JSON.stringify(recoveryStages)) as Stage[];
      
      // Map stages to their corresponding letter
      const stageMap: Record<string, number> = {
        'S': 0,
        'T1': 1,
        'A': 2,
        'R': 3,
        'T2': 4
      };
      
      // Replace template tasks with client-specific tasks
      clientTasks.forEach(apiTask => {
        // Map API stage values to our index values
        let mappedStage = apiTask.stage;
        if (apiTask.stage === 'T') {
          // Check the task theme to determine if it's first or second T stage
          const isTaskRelatedToTransition = apiTask.text.toLowerCase().includes('transition') || 
                                         apiTask.text.toLowerCase().includes('prepare for future') || 
                                         apiTask.text.toLowerCase().includes('emergency plan');
          mappedStage = isTaskRelatedToTransition ? 'T2' : 'T1';
        }
        const stageIndex = stageMap[mappedStage] || 0;
        
        // Find existing task or add new one
        const existingTaskIndex = newStages[stageIndex].tasks.findIndex(
          task => task.text === apiTask.text
        );
        
        if (existingTaskIndex >= 0) {
          // Update existing task
          newStages[stageIndex].tasks[existingTaskIndex] = {
            text: apiTask.text,
            completed: apiTask.completed,
            urgent: apiTask.urgent,
            subtasks: apiTask.subtasks?.map(s => ({
              text: s.text,
              completed: s.completed
            })) || []
          };
        } else {
          // Add new task
          newStages[stageIndex].tasks.push({
            text: apiTask.text,
            completed: apiTask.completed,
            urgent: apiTask.urgent,
            subtasks: apiTask.subtasks?.map(s => ({
              text: s.text,
              completed: s.completed
            })) || []
          });
        }
      });
      
      setStages(newStages);
    } else if (!selectedClient) {
      // Reset to default template if no client selected
      setStages(recoveryStages);
    }
  }, [clientTasks, selectedClient]);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async ({ text, stage }: { text: string, stage: string }) => {
      const response = await apiRequest("POST", "/api/action-plan/tasks", {
        text,
        stage,
        completed: false,
        urgent: false,
        // Add relevant client info if available
        ...(selectedClient?.id ? { survivorId: selectedClient.id } : {})
      });
      return response.json();
    },
    onSuccess: () => {
      // Force a fresh timestamp to trigger a refetch
      setTimestamp(new Date().getTime());
      
      // Invalidate ALL task-related queries to ensure both this page and the dashboard update
      queryClient.invalidateQueries({ queryKey: ["/api/action-plan/tasks"] });
      
      toast({
        title: "Task added",
        description: "A new task has been added to your recovery plan",
        duration: 2000,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add task",
      });
    }
  });

  const handleAddTask = (stageIndex: number) => {
    if (!newTaskText.trim()) return;
    
    // Get the current stage letter
    const stageLetter = stages[stageIndex].letter;
    // Handle the special case for "T" stages
    const stageKey = stageLetter === "T1" ? "T" : 
                     stageLetter === "T2" ? "T" : 
                     stageLetter;

    // Add to the local state first for immediate feedback
    const newStages = [...stages];
    newStages[stageIndex].tasks.push({
      text: newTaskText.trim(),
      completed: false,
      urgent: false,
      subtasks: []
    });
    setStages(newStages);
    
    // Then send to the server
    createTaskMutation.mutate({
      text: newTaskText.trim(),
      stage: stageKey
    });
    
    // Clear the input and editing state
    setNewTaskText("");
    setEditingStage(null);
  };

  const handleAddSubtask = (stageIndex: number, taskIndex: number) => {
    if (!newSubtaskText.trim()) return;

    const newStages = [...stages];
    const taskToUpdate = newStages[stageIndex].tasks[taskIndex];
    
    // Add to local state first
    taskToUpdate.subtasks.push({
      text: newSubtaskText.trim(),
      completed: false
    });
    setStages(newStages);
    
    // Then save to server if possible
    if (selectedClient && clientTasks) {
      const stageLetter = stages[stageIndex].letter;
      const stageKey = stageLetter === "T1" ? "T" : 
                      stageLetter === "T2" ? "T" : 
                      stageLetter;
                      
      const apiTask = clientTasks.find(t => 
        t.text === taskToUpdate.text && 
        (t.stage === stageKey)
      );

      if (apiTask) {
        // Save to server with the updated subtasks list
        updateTaskMutation.mutate({
          taskId: apiTask.id,
          data: { 
            subtasks: taskToUpdate.subtasks.map(st => ({
              id: apiTask.subtasks?.find(s => s.text === st.text)?.id || 0,
              text: st.text,
              completed: st.completed
            }))
          }
        });
      }
    }
    
    setNewSubtaskText("");
  };

  const toggleTaskExpanded = (stageIndex: number, taskIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].tasks[taskIndex].expanded = !newStages[stageIndex].tasks[taskIndex].expanded;
    setStages(newStages);
  };

  const toggleSubtaskCompletion = (stageIndex: number, taskIndex: number, subtaskIndex: number) => {
    const newStages = [...stages];
    const taskToUpdate = newStages[stageIndex].tasks[taskIndex];
    const subtaskToUpdate = taskToUpdate.subtasks[subtaskIndex];
    
    // Toggle completion status
    subtaskToUpdate.completed = !subtaskToUpdate.completed;

    // Check if all subtasks are completed
    const allSubtasksCompleted = taskToUpdate.subtasks.every(st => st.completed);
    taskToUpdate.completed = allSubtasksCompleted;

    setStages(newStages);
    
    // Find the corresponding API task to get its ID
    if (selectedClient && clientTasks) {
      const apiTask = clientTasks.find(t => 
        t.text === taskToUpdate.text && 
        (t.stage === stages[stageIndex].letter || 
          (stages[stageIndex].letter === 'T1' && t.stage === 'T') || 
          (stages[stageIndex].letter === 'T2' && t.stage === 'T')
        )
      );

      if (apiTask) {
        // Save to server
        updateTaskMutation.mutate({
          taskId: apiTask.id,
          data: { 
            completed: taskToUpdate.completed,
            subtasks: taskToUpdate.subtasks.map(st => ({
              id: apiTask.subtasks?.find(s => s.text === st.text)?.id || 0,
              text: st.text,
              completed: st.completed
            }))
          }
        });
      }
    }
  };

  const handleEditTask = (stageIndex: number, taskIndex: number, newText: string) => {
    const newStages = [...stages];
    newStages[stageIndex].tasks[taskIndex].text = newText;
    setStages(newStages);
    setEditingTask(null);
  };

  // Task update mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: number, data: Partial<ApiTask> }) => {
      const response = await apiRequest("PATCH", `/api/action-plan/tasks/${taskId}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Force a fresh timestamp to trigger a refetch everywhere
      setTimestamp(new Date().getTime());
      
      // Use type: 'all' to ensure all query cache for this endpoint is fully invalidated
      queryClient.invalidateQueries({ 
        queryKey: ["/api/action-plan/tasks"],
        type: 'all',  // Forces a complete refresh
        refetchType: 'all' // Refetch all queries (active and inactive)
      });
      
      // Also explicitly invalidate the system config in case task completion affects stages
      queryClient.invalidateQueries({ 
        queryKey: ["/api/system/config"],
        type: 'all'
      });
      
      // Attempt to force a hard refetch by removing the data first
      queryClient.resetQueries({ queryKey: ["/api/action-plan/tasks"] });
      
      toast({
        title: "Task updated",
        description: "Your task has been successfully updated",
        duration: 2000,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update task",
      });
    }
  });

  const toggleTaskCompletion = (stageIndex: number, taskIndex: number) => {
    const newStages = [...stages];
    const taskToUpdate = newStages[stageIndex].tasks[taskIndex];
    const newCompletedStatus = !taskToUpdate.completed;
    taskToUpdate.completed = newCompletedStatus;

    // If the task has subtasks, update their completion status too
    if (taskToUpdate.subtasks.length > 0) {
      taskToUpdate.subtasks.forEach(subtask => {
        subtask.completed = newCompletedStatus;
      });
    }

    setStages(newStages);

    // Find the corresponding API task to get its ID
    if (selectedClient && clientTasks) {
      const apiTask = clientTasks.find(t => 
        t.text === taskToUpdate.text && 
        (t.stage === stages[stageIndex].letter || 
          (stages[stageIndex].letter === 'T1' && t.stage === 'T') || 
          (stages[stageIndex].letter === 'T2' && t.stage === 'T')
        )
      );

      if (apiTask) {
        // Save to server
        updateTaskMutation.mutate({
          taskId: apiTask.id,
          data: { 
            completed: newCompletedStatus,
            // Include subtasks if they exist
            subtasks: taskToUpdate.subtasks.map(st => ({
              id: apiTask.subtasks?.find(s => s.text === st.text)?.id || 0,
              text: st.text,
              completed: st.completed
            }))
          }
        });
      }
    }
  };

  const toggleTaskUrgency = (stageIndex: number, taskIndex: number) => {
    const newStages = [...stages];
    const taskToUpdate = newStages[stageIndex].tasks[taskIndex];
    const newUrgentStatus = !taskToUpdate.urgent;
    taskToUpdate.urgent = newUrgentStatus;
    setStages(newStages);

    // Find the corresponding API task to get its ID
    if (selectedClient && clientTasks) {
      const apiTask = clientTasks.find(t => 
        t.text === taskToUpdate.text && 
        (t.stage === stages[stageIndex].letter || 
          (stages[stageIndex].letter === 'T1' && t.stage === 'T') || 
          (stages[stageIndex].letter === 'T2' && t.stage === 'T')
        )
      );

      if (apiTask) {
        // Save to server
        updateTaskMutation.mutate({
          taskId: apiTask.id,
          data: { urgent: newUrgentStatus }
        });
      }
    }
  };

  const handleSharePlan = async () => {
    try {
      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.set('view', 'public');
      shareUrl.searchParams.delete('token');
      shareUrl.searchParams.delete('user');

      await navigator.clipboard.writeText(shareUrl.toString());
      toast({
        title: "Success",
        description: "Shareable link copied to clipboard! Note: Others can only view this plan without account access.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy link",
      });
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(24);
    doc.text("Recovery Action Plan™", 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text("S.T.A.R.T.™ Framework Progress Report", 20, yPos);
    yPos += 20;

    const date = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.text(`Generated on: ${date}`, 20, yPos);
    yPos += 20;

    stages.forEach((stage) => {
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(`${stage.letter}. ${stage.title}`, 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(stage.description, 20, yPos, { maxWidth: 170 });
      yPos += 10;

      doc.setFontSize(12);
      stage.tasks.forEach(task => {
        const status = `[${task.completed ? '✓' : ' '}] ${task.urgent ? '!' : ' '} `;
        const taskText = status + task.text;

        doc.text(taskText, 25, yPos, { maxWidth: 165 });
        yPos += 10;

        // Add subtasks to PDF
        task.subtasks.forEach(subtask => {
          const subtaskStatus = `  • [${subtask.completed ? '✓' : ' '}] `;
          const subtaskText = subtaskStatus + subtask.text;
          doc.text(subtaskText, 30, yPos, { maxWidth: 160 });
          yPos += 8;

          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
        });

        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });

      yPos += 10;
    });

    doc.setFontSize(8);
    doc.text("© 2025 Disaster Planning. All rights reserved.", 20, 290);

    doc.save("recovery-action-plan.pdf");

    toast({
      title: "Success",
      description: "Your Recovery Action Plan has been exported as a PDF",
    });
  };

  const isPublicView = new URLSearchParams(window.location.search).get('view') === 'public';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <h1 className="text-3xl font-bold tracking-tight">My Recovery Plan</h1>
          </div>
          <p className="text-muted-foreground">
            Track your progress through the S.T.A.R.T. framework for recovery.
          </p>
          
          {!selectedClient && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-dashed flex items-center gap-3 text-muted-foreground">
              <UserCircle className="h-5 w-5" />
              <p>Select a client from the dropdown above to view their specific action plan.</p>
            </div>
          )}
        </div>
        {!isPublicView && (
          <div className="flex flex-col md:flex-row gap-2">
            {/* Current phase selection */}
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">Current Recovery Phase:</div>
              <Select
                disabled={stageMutation.isPending}
                value={systemConfig?.stage || 'S'}
                onValueChange={handleStageChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S">S - Secure & Stabilize</SelectItem>
                  <SelectItem value="T">T - Take Stock</SelectItem>
                  <SelectItem value="A">A - Align Recovery</SelectItem>
                  <SelectItem value="R">R - Rebuild & Restore</SelectItem>
                  <SelectItem value="T2">T - Transition to Normal</SelectItem>
                </SelectContent>
              </Select>
              {stageMutation.isPending && <span className="text-sm text-muted-foreground animate-pulse">Updating...</span>}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSharePlan}>
                <Share2 className="h-4 w-4 mr-2" />
                Share Plan
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {stages.map((stage, stageIndex) => (
          <Card key={stageIndex}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{stage.letter}</span>
                </div>
                <div>
                  <CardTitle className="text-xl">{stage.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stage.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stage.tasks.map((task, taskIndex) => (
                  <div key={taskIndex}>
                    <div
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg transition-colors",
                        task.completed ? "bg-primary/5" : "hover:bg-muted",
                        task.urgent && !task.completed ? "border-l-4 border-destructive" : ""
                      )}
                    >
                      {!isPublicView && editingTask?.stageIndex === stageIndex && editingTask?.taskIndex === taskIndex ? (
                        <div className="flex-1 flex gap-2">
                          <Input
                            value={task.text}
                            onChange={(e) => {
                              const newStages = [...stages];
                              newStages[stageIndex].tasks[taskIndex].text = e.target.value;
                              setStages(newStages);
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleEditTask(stageIndex, taskIndex, task.text)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingTask(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            className={cn(
                              "w-5 h-5 rounded-full border-2 transition-colors flex items-center justify-center",
                              task.completed
                                ? "bg-primary border-primary"
                                : "border-muted-foreground hover:border-primary"
                            )}
                            onClick={() => !isPublicView && toggleTaskCompletion(stageIndex, taskIndex)}
                            disabled={isPublicView}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="p-0 h-8 w-8"
                            onClick={() => toggleTaskExpanded(stageIndex, taskIndex)}
                          >
                            {task.expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <span className={cn(
                            "flex-1",
                            task.completed && "line-through text-muted-foreground"
                          )}>
                            {task.text}
                          </span>
                          {!isPublicView && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={cn(
                                  "p-0 h-8 w-8",
                                  task.urgent && "text-destructive"
                                )}
                                onClick={() => toggleTaskUrgency(stageIndex, taskIndex)}
                              >
                                <AlertCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingTask({ stageIndex, taskIndex })}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {task.expanded && (
                      <div className="ml-8 mt-2 space-y-2">
                        {task.subtasks.map((subtask, subtaskIndex) => (
                          <div
                            key={subtaskIndex}
                            className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted"
                          >
                            <button
                              className={cn(
                                "w-4 h-4 rounded-full border-2 transition-colors flex items-center justify-center",
                                subtask.completed
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground hover:border-primary"
                              )}
                              onClick={() => !isPublicView && toggleSubtaskCompletion(stageIndex, taskIndex, subtaskIndex)}
                              disabled={isPublicView}
                            />
                            <span className={cn(
                              "text-sm",
                              subtask.completed && "line-through text-muted-foreground"
                            )}>
                              {subtask.text}
                            </span>
                          </div>
                        ))}

                        {!isPublicView && (
                          <div className="flex gap-2">
                            <Input
                              size="sm"
                              placeholder="Add subtask..."
                              value={newSubtaskText}
                              onChange={(e) => setNewSubtaskText(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddSubtask(stageIndex, taskIndex);
                                }
                              }}
                              className="text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleAddSubtask(stageIndex, taskIndex)}
                            >
                              Add
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {!isPublicView && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new task..."
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTask(stageIndex);
                        }
                      }}
                    />
                    <Button onClick={() => handleAddTask(stageIndex)}>
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}