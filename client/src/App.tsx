import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Documents from "@/pages/documents";
import Messages from "@/pages/messages";
import Contacts from "@/pages/contacts";
import Profile from "@/pages/profile";
import CapitalSources from "@/pages/capital-sources";
import ActionPlan from "@/pages/action-plan";
import Household from "@/pages/household";
import AuthPage from "@/pages/auth-page";
import ResetPassword from "@/pages/reset-password";
import AdminPage from "@/pages/admin";
import OrgAdminPage from "@/pages/org-admin";
import OrgDashboard from "@/pages/org-dashboard";
import PractitionerDashboard from "@/pages/practitioner-dashboard";
import FundingOpportunities from "@/pages/funding-opportunities";
import OpportunityMatches from "@/pages/opportunity-matches";
import AllClients from "@/pages/all-clients";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ClientProvider } from "@/contexts/client-context";
import { Loader2 } from "lucide-react";
import { RoleBasedRoute } from "@/components/layout/role-based-route";

// Lazy load admin subpages
const OrganizationsPage = lazy(() => import("@/pages/admin/organizations"));
const AllClientsPage = lazy(() => import("@/pages/admin/clients"));
const OrganizationSettingsPage = lazy(() => import("@/pages/organizations/settings"));

// Loading component to show while components are loading
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Component to wrap lazy-loaded components with Suspense
const LazyRouteComponent = ({ component: Component }: { component: React.ComponentType<any> }) => (
  <Suspense fallback={<LoadingFallback />}>
    <Component />
  </Suspense>
);

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {/* Shared Routes for All Users */}
      <RoleBasedRoute path="/action-plan" component={ActionPlan} allowedRoles={["super_admin", "admin", "case_manager", "user"]} />
      <RoleBasedRoute path="/household" component={Household} allowedRoles={["super_admin", "admin", "case_manager", "user"]} />
      <RoleBasedRoute path="/documents" component={Documents} allowedRoles={["super_admin", "admin", "case_manager", "user"]} />
      <RoleBasedRoute path="/messages" component={Messages} allowedRoles={["super_admin", "admin", "case_manager", "user"]} />
      <RoleBasedRoute path="/contacts" component={Contacts} allowedRoles={["super_admin", "admin", "case_manager", "user"]} />
      <RoleBasedRoute path="/capital-sources" component={CapitalSources} allowedRoles={["super_admin", "admin", "case_manager", "user"]} />
      <RoleBasedRoute path="/profile" component={Profile} allowedRoles={["super_admin", "admin", "case_manager", "user"]} />
      
      {/* Super Admin Only Routes */}
      <RoleBasedRoute path="/admin" component={AdminPage} allowedRoles={["super_admin"]} />
      <RoleBasedRoute 
        path="/admin/organizations" 
        component={lazy(() => import("@/pages/admin/organizations"))} 
        allowedRoles={["super_admin"]} 
      />
      <RoleBasedRoute 
        path="/admin/clients" 
        component={lazy(() => import("@/pages/admin/clients"))} 
        allowedRoles={["super_admin"]} 
      />
      <RoleBasedRoute 
        path="/admin/email-test" 
        component={lazy(() => import("@/pages/admin/email-test"))} 
        allowedRoles={["super_admin"]} 
      />
      
      {/* Admin Only Routes */}
      <RoleBasedRoute path="/org-admin" component={OrgAdminPage} allowedRoles={["admin"]} />
      <RoleBasedRoute path="/org-dashboard" component={OrgDashboard} allowedRoles={["admin"]} />
      <RoleBasedRoute path="/all-clients" component={AllClients} allowedRoles={["admin"]} />
      <RoleBasedRoute path="/add-client" component={lazy(() => import("@/pages/add-client"))} allowedRoles={["admin"]} />
      
      {/* Home Routes - Role Specific */}
      <RoleBasedRoute path="/" component={OrgDashboard} allowedRoles={["admin"]} />
      {/* Explicitly define the survivor route to ensure they get priority */}
      <Route path="/">
        {() => {
          const { user, isLoading } = useAuth();
          
          // If loading, show spinner
          if (isLoading) {
            return (
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            );
          }
          
          // Handle routing based on user type explicitly
          if (user?.userType === 'survivor') {
            console.log('🏠 Rendering home page for survivor');
            return <Home />;
          } else if (user?.role === 'super_admin') {
            return <Redirect to="/admin" />;
          } else if (user?.role === 'admin') {
            return <Redirect to="/org-dashboard" />;
          } else if (user?.role === 'case_manager') {
            return <Redirect to="/practitioner-dashboard" />;
          } else if (user) {
            // Default case for users
            return <Home />;
          } else {
            // Not logged in
            return <Redirect to="/auth" />;
          }
        }}
      </Route>
      
      {/* Route accessible to both Super Admin and Admin */}
      <RoleBasedRoute 
        path="/organizations/:id/settings" 
        component={lazy(() => import("@/pages/organizations/settings"))} 
        allowedRoles={["super_admin", "admin"]} 
      />
      
      {/* Admin/SuperAdmin Shared Routes */}
      <RoleBasedRoute path="/funding-opportunities" component={FundingOpportunities} allowedRoles={["super_admin", "admin"]} />
      <RoleBasedRoute path="/opportunity-matches" component={OpportunityMatches} allowedRoles={["super_admin", "admin"]} />
      
      {/* Case Manager/Practitioner Routes */}
      <RoleBasedRoute path="/practitioner-dashboard" component={PractitionerDashboard} allowedRoles={["case_manager"]} />
      <RoleBasedRoute path="/practitioner/clients" component={PractitionerDashboard} allowedRoles={["case_manager"]} />
      
      {/* 404 Page - Needs special handling for layout */}
      <Route>
        <NotFound />
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