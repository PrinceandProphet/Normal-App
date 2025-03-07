import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle2 } from "lucide-react";

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
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Recovery Action Plan</h1>
        <p className="text-muted-foreground">
          Track your progress through the S.T.A.R.T. framework for disaster recovery.
        </p>
      </div>

      <div className="grid gap-6">
        {recoveryStages.map((stage, index) => (
          <Card key={index}>
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
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
