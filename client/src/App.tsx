import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import Home from "@/pages/home";
import Documents from "@/pages/documents";
import Messages from "@/pages/messages";
import Contacts from "@/pages/contacts";
import Profile from "@/pages/profile";
import CapitalSources from "@/pages/capital-sources";
import ActionPlan from "@/pages/action-plan";
import Household from "@/pages/household";
import AuthPage from "@/pages/auth-page";
import AdminPage from "@/pages/admin";
import OrgAdminPage from "@/pages/org-admin";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      <Route path="*">
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8">
            <Switch>
              <ProtectedRoute path="/" component={Home} />
              <ProtectedRoute path="/action-plan" component={ActionPlan} />
              <ProtectedRoute path="/household" component={Household} />
              <ProtectedRoute path="/documents" component={Documents} />
              <ProtectedRoute path="/messages" component={Messages} />
              <ProtectedRoute path="/contacts" component={Contacts} />
              <ProtectedRoute path="/capital-sources" component={CapitalSources} />
              <ProtectedRoute path="/profile" component={Profile} />
              <ProtectedRoute path="/admin" component={AdminPage} />
              <ProtectedRoute path="/org-admin" component={OrgAdminPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;