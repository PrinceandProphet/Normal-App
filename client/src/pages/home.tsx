import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, MessageSquare, Users, CheckSquare } from "lucide-react";

export default function Home() {
  const { data: documents } = useQuery({
    queryKey: ["/api/documents"],
  });

  const { data: contacts } = useQuery({
    queryKey: ["/api/contacts"],
  });

  const { data: checklists } = useQuery({
    queryKey: ["/api/checklists"],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Disaster Planning Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents?.length || 0}</div>
            <Link href="/documents">
              <Button variant="link" className="px-0">Manage Documents →</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts?.filter(c => c.isEmergency).length || 0}
            </div>
            <Link href="/contacts">
              <Button variant="link" className="px-0">Manage Contacts →</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checklists</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checklists?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {checklists?.filter(c => c.completed.every(Boolean)).length || 0} completed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/documents">
              <Button className="w-full">Upload New Document</Button>
            </Link>
            <Link href="/contacts">
              <Button variant="outline" className="w-full">Add Emergency Contact</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/messages">
              <Button variant="link" className="px-0">View All Messages →</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
