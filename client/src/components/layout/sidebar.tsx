import { Link as RouterLink, useLocation } from "wouter";
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
  ServerCog,
  Link as LinkIcon,
  Handshake,
  BarChart4,

  AlarmClock,
  Clipboard,
  BookOpen
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

// Navigation configuration with role-based access
const navigationConfig = {
  // Super Admin only navigation
  superAdminNav: [
    { name: "Admin Dashboard", href: "/admin", icon: ServerCog },
    { name: "Organizations", href: "/admin/organizations", icon: Building2 },
    { name: "All Clients", href: "/admin/clients", icon: Users },
    { name: "System Settings", href: "/admin/settings", icon: Settings },
  ],
  
  // Organization Admin navigation
  orgAdminNav: [
    { name: "Org Dashboard", href: "/org-admin", icon: BarChart4 },
    { name: "Organization Settings", href: "/organizations/:id/settings", icon: Building2, dynamicParam: true },
  ],
  
  // Case Manager navigation
  caseManagerNav: [
    { name: "Practitioner Dashboard", href: "/practitioner-dashboard", icon: Clipboard },
    { name: "My Clients", href: "/practitioner/clients", icon: Users },
    { name: "My Tasks", href: "/action-plan", icon: AlarmClock },
  ],
  
  // Shared admin features (for super_admin and admin)
  sharedAdminNav: [
    { name: "Funding Opportunities", href: "/funding-opportunities", icon: DollarSign },
    { name: "Opportunity Matches", href: "/opportunity-matches", icon: Handshake },
    { name: "Knowledge Base", href: "/admin/resources", icon: BookOpen },
  ],
  
  // Client/User navigation - focused only on their recovery journey
  clientNav: [
    { name: "Home", href: "/", icon: Home },
    { name: "My Action Plan", href: "/action-plan", icon: Shield },
    { name: "My Household", href: "/household", icon: Building2 },
    { name: "My Documents", href: "/documents", icon: FileText },
    { name: "My Messages", href: "/messages", icon: MessageSquare },
    { name: "Profile Settings", href: "/profile", icon: Settings },
  ]
};

export default function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [clientMenuCollapsed, setClientMenuCollapsed] = useState(false);
  const { logoutMutation, user } = useAuth();

  if (!user) {
    return null; // Don't render sidebar if no user
  }

  // Generate dynamic nav items for current user
  const getNavItems = () => {
    const { role, organizationId } = user;
    const navItems = [];
    
    // Add role-specific navigation sections
    if (role === "super_admin") {
      navItems.push(...navigationConfig.superAdminNav);
      navItems.push(...navigationConfig.sharedAdminNav);
      // Super admins can see client sections but they're collapsible
    } else if (role === "admin") {
      navItems.push(...navigationConfig.orgAdminNav.map(item => {
        // Replace dynamic parameters like :id with actual values
        if (item.dynamicParam && item.href.includes(':id') && organizationId) {
          return {
            ...item,
            href: item.href.replace(':id', organizationId.toString())
          };
        }
        return item;
      }));
      navItems.push(...navigationConfig.sharedAdminNav);
      // Admins can see client sections but they're collapsible
    } else if (role === "case_manager") {
      navItems.push(...navigationConfig.caseManagerNav);
      // Case managers directly see client sections (not collapsible)
      navItems.push(...navigationConfig.clientNav);
    } else {
      // Regular users (survivors/clients) only see client navigation
      navItems.push(...navigationConfig.clientNav);
    }
    
    return navItems;
  };

  // Determine if user should see the client sections separately
  const showClientSectionCollapsible = user.role === "super_admin" || user.role === "admin";
  
  // Get the appropriate navigation items
  const navItems = getNavItems();
  
  // For admin users, we filter out client navigation to show it separately
  const adminNavItems = showClientSectionCollapsible 
    ? navItems.filter(item => !navigationConfig.clientNav.some(clientItem => clientItem.href === item.href))
    : navItems;
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Helper function to render a navigation item
  const renderNavItem = (item: any, isCollapsed: boolean = false) => {
    const Icon = item.icon;
    const isActive = item.href === location || 
                    (item.href !== '/' && location.startsWith(item.href));
                    
    return (
      <RouterLink 
        href={item.href}
        className={cn(
          "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg mb-1.5 transition-colors",
          "hover:bg-primary/10 hover:text-primary",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-gray-600"
        )}
        title={isCollapsed ? item.name : undefined}
      >
        <Icon className={cn("h-5 w-5", isCollapsed ? "mr-0" : "mr-3")} />
        {!isCollapsed && item.name}
      </RouterLink>
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

      <nav className="px-4 py-6 flex-grow overflow-y-auto">
        {/* Main Navigation Section */}
        {adminNavItems.map((item, index) => {
          const showDivider = index === adminNavItems.length - 1 && showClientSectionCollapsible;
          return (
            <div key={item.name}>
              {renderNavItem(item, collapsed)}
              {showDivider && (
                <div className="h-px bg-border/60 my-2 mx-1" />
              )}
            </div>
          );
        })}

        {/* Client Navigation Section with collapsible header for admins */}
        {showClientSectionCollapsible && !collapsed ? (
          <div 
            className="flex items-center justify-between px-3 py-2 mb-1 text-sm font-medium text-gray-600 cursor-pointer hover:bg-primary/5 rounded-lg"
            onClick={() => setClientMenuCollapsed(!clientMenuCollapsed)}
          >
            <span>Client Sections</span>
            {clientMenuCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </div>
        ) : null}

        {/* Client Navigation Items */}
        {showClientSectionCollapsible && (
          <div className={cn(
            "transition-all duration-300 overflow-hidden",
            !clientMenuCollapsed || collapsed ? "max-h-96" : "max-h-0"
          )}>
            {navigationConfig.clientNav.map((item) => (
              <div key={item.name}>
                {renderNavItem(item, collapsed)}
              </div>
            ))}
          </div>
        )}
      </nav>
      
      {/* Logout button */}
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
            <div>Logged in as:</div> 
            <div className="font-medium truncate">{user.username || user.name}</div>
            {user.organizationId && (
              <div className="mt-1 text-xs text-primary/80">
                Organization ID: {user.organizationId}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}