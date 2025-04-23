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
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { ClientProvider } from "@/hooks/use-client-context";
import { ClientSelector } from "@/components/client-selector";
import { ProtectedRoute } from "@/lib/protected-route";
import { Loader2 } from "lucide-react";

// Lazy load admin subpages
const OrganizationsPage = lazy(() => import("@/pages/admin/organizations"));
const AllClientsPage = lazy(() => import("@/pages/admin/clients"));

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      <Route path="*">
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-foreground">
                <ClientSelector />
              </h1>
            </div>
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
              <ProtectedRoute path="/admin/organizations" component={OrganizationsPage} />
              <ProtectedRoute path="/admin/clients" component={AllClientsPage} />
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
        <ClientProvider>
          <Router />
          <Toaster />
        </ClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;