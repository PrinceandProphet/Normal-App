import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  MessageSquare, 
  Users, 
  Home,
  AlertTriangle
} from "lucide-react";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Contacts", href: "/contacts", icon: Users },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <AlertTriangle className="h-6 w-6 text-primary mr-2" />
        <span className="text-lg font-semibold text-sidebar-foreground">
          Disaster Planning
        </span>
      </div>
      <nav className="px-4 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={cn(
                  "flex items-center px-2 py-2 text-sm rounded-md mb-1",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  location === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground"
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </a>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
