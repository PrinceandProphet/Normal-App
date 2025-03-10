import { Switch, Route, useLocation, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import Login from "@/pages/login";
import Home from "@/pages/home";
import Documents from "@/pages/documents";
import Messages from "@/pages/messages";
import Contacts from "@/pages/contacts";
import Profile from "@/pages/profile";
import CapitalSources from "@/pages/capital-sources";
import ActionPlan from "@/pages/action-plan";
import Household from "@/pages/household";

// Protected Route wrapper component
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any> }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return <Component {...rest} />;
}

function Router() {
  const { user } = useAuth();
  const [location] = useLocation();

  // Redirect from login if already authenticated
  if (user && location === "/login") {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex h-screen bg-background">
      {user && <Sidebar />}
      <main className={`flex-1 overflow-y-auto ${user ? 'p-8' : ''}`}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/" component={() => <ProtectedRoute component={Home} />} />
          <Route path="/action-plan" component={() => <ProtectedRoute component={ActionPlan} />} />
          <Route path="/household" component={() => <ProtectedRoute component={Household} />} />
          <Route path="/documents" component={() => <ProtectedRoute component={Documents} />} />
          <Route path="/messages" component={() => <ProtectedRoute component={Messages} />} />
          <Route path="/contacts" component={() => <ProtectedRoute component={Contacts} />} />
          <Route path="/capital-sources" component={() => <ProtectedRoute component={CapitalSources} />} />
          <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;