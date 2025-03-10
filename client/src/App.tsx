import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import CaseManagerLayout from "@/layouts/CaseManagerLayout";
import Home from "@/pages/home";
import Documents from "@/pages/documents";
import Messages from "@/pages/messages";
import Contacts from "@/pages/contacts";
import Profile from "@/pages/profile";
import CapitalSources from "@/pages/capital-sources";
import ActionPlan from "@/pages/action-plan";
import Household from "@/pages/household";
import CaseManager from "@/pages/case-manager";

// Split into two router components for cleaner organization
function SurvivorRouter() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/action-plan" component={ActionPlan} />
          <Route path="/household" component={Household} />
          <Route path="/documents" component={Documents} />
          <Route path="/messages" component={Messages} />
          <Route path="/contacts" component={Contacts} />
          <Route path="/capital-sources" component={CapitalSources} />
          <Route path="/profile" component={Profile} />
        </Switch>
      </main>
    </div>
  );
}

function CaseManagerRouter() {
  return (
    <CaseManagerLayout>
      <Switch>
        <Route path="/case-manager" component={CaseManager} />
        <Route path="/case-manager/survivors" component={() => <div>Survivors Management</div>} />
        <Route path="/case-manager/funding" component={() => <div>Funding Opportunities</div>} />
        <Route path="/case-manager/settings" component={() => <div>Organization Settings</div>} />
      </Switch>
    </CaseManagerLayout>
  );
}

function Router() {
  // This will be replaced with actual role-based routing once authentication is implemented
  const isCaseManager = window.location.pathname.startsWith('/case-manager');

  return (
    <>
      {isCaseManager ? <CaseManagerRouter /> : <SurvivorRouter />}
      <Route component={NotFound} />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;