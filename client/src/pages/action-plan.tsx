import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Shield, Share2, FileDown, Pencil, X, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const recoveryStages = [
  {
    letter: "S",
    title: "Secure & Stabilize",
    description: "Find shelter, register for aid, meet urgent medical & food needs.",
    tasks: [
      "Locate safe temporary shelter",
      "Register with FEMA",
      "Address immediate medical needs",
      "Secure food and water supply"
    ]
  },
  {
    letter: "T",
    title: "Take Stock & Track Assistance",
    description: "Document losses, apply for FEMA & insurance, secure financial relief.",
    tasks: [
      "Document property damage",
      "File insurance claims",
      "Apply for FEMA assistance",
      "Track aid applications"
    ]
  },
  {
    letter: "A",
    title: "Align Recovery Plan & Resources",
    description: "Assess long-term housing, begin repair planning, appeal denied claims.",
    tasks: [
      "Evaluate long-term housing options",
      "Create repair/rebuild plan",
      "Appeal denied claims if necessary",
      "Identify available resources"
    ]
  },
  {
    letter: "R",
    title: "Rebuild & Restore Stability",
    description: "Hire contractors, complete home repairs, secure job & financial recovery.",
    tasks: [
      "Vet and hire contractors",
      "Oversee repairs/reconstruction",
      "Address employment needs",
      "Establish financial stability"
    ]
  },
  {
    letter: "T",
    title: "Transition to Normal & Prepare for Future",
    description: "Close aid cases, submit tax claims, update emergency plans.",
    tasks: [
      "Close assistance cases",
      "File tax-related claims",
      "Update emergency plans",
      "Document lessons learned"
    ]
  }
];

export default function ActionPlan() {
  const [editingStage, setEditingStage] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<{ stageIndex: number; taskIndex: number } | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [stages, setStages] = useState(recoveryStages);

  const handleAddTask = (stageIndex: number) => {
    if (!newTaskText.trim()) return;

    const newStages = [...stages];
    newStages[stageIndex].tasks.push(newTaskText.trim());
    setStages(newStages);
    setNewTaskText("");
    setEditingStage(null);
  };

  const handleEditTask = (stageIndex: number, taskIndex: number, newText: string) => {
    const newStages = [...stages];
    newStages[stageIndex].tasks[taskIndex] = newText;
    setStages(newStages);
    setEditingTask(null);
  };

  const handleSharePlan = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Success",
        description: "Link copied to clipboard!",
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
    // PDF export functionality will be implemented here
    toast({
      title: "Coming Soon",
      description: "PDF export functionality will be available soon!",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Recovery Action Plan™</h1>
          <p className="text-muted-foreground">
            Track your progress through the S.T.A.R.T.™ framework for disaster recovery.
          </p>
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
                  <div key={taskIndex} className="flex items-center gap-2">
                    {editingTask?.stageIndex === stageIndex && editingTask?.taskIndex === taskIndex ? (
                      <div className="flex-1 flex gap-2">
                        <Input 
                          value={task}
                          onChange={(e) => {
                            const newStages = [...stages];
                            newStages[stageIndex].tasks[taskIndex] = e.target.value;
                            setStages(newStages);
                          }}
                        />
                        <Button 
                          size="sm"
                          onClick={() => handleEditTask(stageIndex, taskIndex, task)}
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
                        <span className="flex-1">{task}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTask({ stageIndex, taskIndex })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
                {editingStage === stageIndex ? (
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
                    <Button
                      variant="ghost"
                      onClick={() => setEditingStage(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-center"
                    onClick={() => setEditingStage(stageIndex)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Task
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}