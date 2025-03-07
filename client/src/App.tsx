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

function Router() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/documents" component={Documents} />
          <Route path="/messages" component={Messages} />
          <Route path="/contacts" component={Contacts} />
          <Route path="/profile" component={Profile} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
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