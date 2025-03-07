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
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Action Plan", href: "/action-plan", icon: Shield },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Capital Sources", href: "/capital-sources", icon: DollarSign },
  { name: "Profile Settings", href: "/profile", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cn(
      "relative bg-card shadow-lg transition-all duration-300",
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

      <nav className="px-4 py-6">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <a
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
              </a>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}