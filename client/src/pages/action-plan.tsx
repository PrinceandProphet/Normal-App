import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Shield, Share2, FileDown, Pencil, X, Save, AlertCircle, ChevronRight, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

export default function ActionPlan() {
  const [editingStage, setEditingStage] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<{ stageIndex: number; taskIndex: number } | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<{ stageIndex: number; taskIndex: number; subtaskIndex: number } | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [stages, setStages] = useState(recoveryStages);
  const toast = useToast();

  const handleAddTask = (stageIndex: number) => {
    if (!newTaskText.trim()) return;

    const newStages = [...stages];
    newStages[stageIndex].tasks.push({
      text: newTaskText.trim(),
      completed: false,
      urgent: false,
      subtasks: []
    });
    setStages(newStages);
    setNewTaskText("");
    setEditingStage(null);
  };

  const handleAddSubtask = (stageIndex: number, taskIndex: number) => {
    if (!newSubtaskText.trim()) return;

    const newStages = [...stages];
    newStages[stageIndex].tasks[taskIndex].subtasks.push({
      text: newSubtaskText.trim(),
      completed: false
    });
    setStages(newStages);
    setNewSubtaskText("");
  };

  const toggleTaskExpanded = (stageIndex: number, taskIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].tasks[taskIndex].expanded = !newStages[stageIndex].tasks[taskIndex].expanded;
    setStages(newStages);
  };

  const toggleSubtaskCompletion = (stageIndex: number, taskIndex: number, subtaskIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].tasks[taskIndex].subtasks[subtaskIndex].completed =
      !newStages[stageIndex].tasks[taskIndex].subtasks[subtaskIndex].completed;

    // Check if all subtasks are completed
    const allSubtasksCompleted = newStages[stageIndex].tasks[taskIndex].subtasks.every(st => st.completed);
    if (allSubtasksCompleted) {
      newStages[stageIndex].tasks[taskIndex].completed = true;
    } else {
      newStages[stageIndex].tasks[taskIndex].completed = false;
    }

    setStages(newStages);
  };

  const handleEditTask = (stageIndex: number, taskIndex: number, newText: string) => {
    const newStages = [...stages];
    newStages[stageIndex].tasks[taskIndex].text = newText;
    setStages(newStages);
    setEditingTask(null);
  };

  const toggleTaskCompletion = (stageIndex: number, taskIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].tasks[taskIndex].completed = !newStages[stageIndex].tasks[taskIndex].completed;

    // If the task has subtasks, update their completion status too
    const task = newStages[stageIndex].tasks[taskIndex];
    if (task.subtasks.length > 0) {
      task.subtasks.forEach(subtask => {
        subtask.completed = task.completed;
      });
    }

    setStages(newStages);

    // Invalidate the tasks query to update the home page
    queryClient.invalidateQueries({ queryKey: ["/api/action-plan/tasks"] });
  };

  const toggleTaskUrgency = (stageIndex: number, taskIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].tasks[taskIndex].urgent = !newStages[stageIndex].tasks[taskIndex].urgent;
    setStages(newStages);
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
          <h1 className="text-3xl font-bold tracking-tight">Recovery Action Plan™</h1>
          <p className="text-muted-foreground">
            Track your progress through the S.T.A.R.T.™ framework for disaster recovery.
          </p>
        </div>
        {!isPublicView && (
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