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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building2,
  LogOut,
  ServerCog
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

// Define navigation with sections
const adminNavigation = [
  // Super Admin Section
  { name: "Admin Dashboard", href: "/admin", icon: ServerCog, roles: ["super_admin"] },
  { name: "Organizations", href: "/admin/organizations", icon: Building2, roles: ["super_admin"] },
  { name: "All Clients", href: "/admin/clients", icon: Users, roles: ["super_admin"] },
  
  // Org Admin Section
  { name: "Organization Dashboard", href: "/org-admin", icon: Building2, roles: ["admin"] },
];

// User navigation - can be collapsed
const userNavigation = [
  // Regular user navigation
  { name: "Home", href: "/", icon: Home },
  { name: "Action Plan", href: "/action-plan", icon: Shield },
  { name: "Household & Properties", href: "/household", icon: Building2 },
  { name: "Capital Sources", href: "/capital-sources", icon: DollarSign },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Profile Settings", href: "/profile", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuCollapsed, setUserMenuCollapsed] = useState(false);
  const { logoutMutation, user } = useAuth();

  // Check if user is admin or super_admin
  const isAdminUser = user && (user.role === 'admin' || user.role === 'super_admin');

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Helper function to render a navigation item
  const renderNavItem = (item: any, isCollapsed: boolean = false) => {
    const Icon = item.icon;
    return (
      <Link 
        href={item.href}
        className={cn(
          "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg mb-1.5 transition-colors",
          "hover:bg-primary/10 hover:text-primary",
          location === item.href
            ? "bg-primary/10 text-primary"
            : "text-gray-600"
        )}
        title={isCollapsed ? item.name : undefined}
      >
        <Icon className={cn("h-5 w-5", isCollapsed ? "mr-0" : "mr-3")} />
        {!isCollapsed && item.name}
      </Link>
    );
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
        {/* Admin Navigation Section */}
        {user && adminNavigation
          .filter(item => item.roles.includes(user.role))
          .map((item, index, filteredItems) => {
            const showDivider = index === filteredItems.length - 1 && filteredItems.length > 0;
            return (
              <div key={item.name}>
                {renderNavItem(item, collapsed)}
                {showDivider && (
                  <div className="h-px bg-border/60 my-2 mx-1" />
                )}
              </div>
            );
          })}

        {/* User Navigation Section with collapsible header for admins */}
        {isAdminUser && !collapsed ? (
          <div 
            className="flex items-center justify-between px-3 py-2 mb-1 text-sm font-medium text-gray-600 cursor-pointer hover:bg-primary/5 rounded-lg"
            onClick={() => setUserMenuCollapsed(!userMenuCollapsed)}
          >
            <span>Client Sections</span>
            {userMenuCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </div>
        ) : null}

        {/* User Navigation Items */}
        {(!isAdminUser || !userMenuCollapsed || collapsed) && (
          <div className={cn(
            "transition-all duration-300 overflow-hidden",
            !isAdminUser || !userMenuCollapsed || collapsed ? "max-h-96" : "max-h-0"
          )}>
            {userNavigation.map((item) => (
              <div key={item.name}>
                {renderNavItem(item, collapsed)}
              </div>
            ))}
          </div>
        )}
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