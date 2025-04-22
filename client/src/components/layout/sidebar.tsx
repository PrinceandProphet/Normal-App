import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  MessageSquare, 
  Users, 
  Home,
  Shield,
  Settings,
  DollarSign,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Building2,
  LogOut,
  ServerCog
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const navigation = [
  { name: "Organization Dashboard", href: "/org-admin", icon: Building2, roles: ["admin"], isSpecial: true },
  { name: "Home", href: "/", icon: Home },
  { name: "Action Plan", href: "/action-plan", icon: Shield },
  { name: "Household & Properties", href: "/household", icon: Building2 },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Capital Sources", href: "/capital-sources", icon: DollarSign },
  { name: "Profile Settings", href: "/profile", icon: Settings },
  { name: "Admin Dashboard", href: "/admin", icon: ServerCog, roles: ["super_admin"] },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { logoutMutation, user } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className={cn(
      "relative bg-card shadow-lg transition-all duration-300 h-full flex flex-col",
      collapsed ? "w-16" : "w-72"
    )}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-4 top-8 h-8 w-8 rounded-full bg-background shadow-md"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      <div className="h-16 flex items-center px-6 bg-primary/5">
        <Shield className="h-6 w-6 text-primary mr-2" />
        {!collapsed && (
          <span className="text-lg font-semibold text-primary">
            Disaster Planning
          </span>
        )}
      </div>

      <nav className="px-4 py-6 flex-grow">
        {navigation
          .filter(item => !item.roles || (user && item.roles.includes(user.role)))
          .map((item, index, filteredItems) => {
            const Icon = item.icon;
            const showDivider = item.isSpecial && 
              index < filteredItems.length - 1 && 
              filteredItems[index + 1] && 
              !filteredItems[index + 1].isSpecial;
              
            return (
              <div key={item.name}>
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg mb-1.5 transition-colors",
                    "hover:bg-primary/10 hover:text-primary",
                    location === item.href
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className={cn("h-5 w-5", collapsed ? "mr-0" : "mr-3")} />
                  {!collapsed && item.name}
                </Link>
                {showDivider && (
                  <div className="h-px bg-border/60 my-2 mx-1" />
                )}
              </div>
            );
          })}
      </nav>
      
      {/* Logout button */}
      {user && (
        <div className="px-4 pb-6 mt-auto">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
              "bg-red-50 text-red-600 hover:bg-red-100"
            )}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className={cn("h-5 w-5", collapsed ? "mr-0" : "mr-3")} />
            {!collapsed && "Logout"}
          </button>
          
          {!collapsed && (
            <div className="mt-3 px-3 text-xs text-gray-500">
              Logged in as: <span className="font-medium">{user.username || user.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}