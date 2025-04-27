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
import FundingOpportunities from "@/pages/funding-opportunities";
import OpportunityMatches from "@/pages/opportunity-matches";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { ClientProvider } from "@/hooks/use-client-context";
import { ClientSelector } from "@/components/client-selector";
import { Loader2 } from "lucide-react";
import LoadingWrapper from "@/components/loading-wrapper";
import AuthCheck from "@/components/auth-check";

// Lazy load admin subpages
const OrganizationsPage = lazy(() => import("@/pages/admin/organizations"));
const AllClientsPage = lazy(() => import("@/pages/admin/clients"));

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      <Route path="*">
        <LoadingWrapper delay={100} fullHeight={true}>
          <div className="flex h-screen bg-background">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-foreground">
                  <ClientSelector />
                </h1>
              </div>
              <Switch>
                <Route path="/">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50}>
                      <Home />
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route path="/action-plan">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50}>
                      <ActionPlan />
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route path="/household">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50}>
                      <Household />
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route path="/documents">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50}>
                      <Documents />
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route path="/messages">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50}>
                      <Messages />
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route path="/contacts">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50}>
                      <Contacts />
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route path="/capital-sources">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50}>
                      <CapitalSources />
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route path="/profile">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50}>
                      <Profile />
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route path="/admin">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50}>
                      <AdminPage />
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route path="/admin/organizations">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50} isForm>
                      <Suspense fallback={<LoadingFallback />}>
                        <OrganizationsPage />
                      </Suspense>
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route path="/admin/clients">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50} isForm>
                      <Suspense fallback={<LoadingFallback />}>
                        <AllClientsPage />
                      </Suspense>
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route path="/org-admin">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50}>
                      <OrgAdminPage />
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route path="/funding-opportunities">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50}>
                      <FundingOpportunities />
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route path="/opportunity-matches">
                  <AuthCheck noLoading>
                    <LoadingWrapper delay={50}>
                      <OpportunityMatches />
                    </LoadingWrapper>
                  </AuthCheck>
                </Route>
                <Route>
                  <NotFound />
                </Route>
              </Switch>
            </main>
          </div>
        </LoadingWrapper>
      </Route>
    </Switch>
  );
}

// Loading component to show while components are loading
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

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