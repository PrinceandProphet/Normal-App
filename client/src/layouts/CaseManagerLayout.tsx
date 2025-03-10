import { Link, useLocation } from "wouter";
import {
  Building2,
  Users,
  DollarSign,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navigation = [
  {
    name: "Dashboard",
    href: "/case-manager",
    icon: Building2,
  },
  {
    name: "Survivors",
    href: "/case-manager/survivors",
    icon: Users,
  },
  {
    name: "Funding Opportunities",
    href: "/case-manager/funding",
    icon: DollarSign,
  },
  {
    name: "Organization Settings",
    href: "/case-manager/settings",
    icon: Settings,
  },
];

export default function CaseManagerLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <img
              className="h-8 w-auto"
              src="/logo.svg"
              alt="Your Company"
            />
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.name}>
                        <Link href={item.href}>
                          <a
                            className={`
                              group flex gap-x-3 rounded-md p-2 text-sm leading-6 
                              ${location === item.href
                                ? "bg-gray-50 text-primary font-semibold"
                                : "text-gray-700 hover:text-primary hover:bg-gray-50"
                              }
                            `}
                          >
                            <Icon className="h-6 w-6 shrink-0" />
                            {item.name}
                          </a>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
              <li className="mt-auto">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Link>
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden absolute left-4 top-4">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>
              <img
                className="h-8 w-auto"
                src="/logo.svg"
                alt="Your Company"
              />
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-1 flex-col mt-4">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.name}>
                        <Link href={item.href}>
                          <a
                            className={`
                              group flex gap-x-3 rounded-md p-2 text-sm leading-6 
                              ${location === item.href
                                ? "bg-gray-50 text-primary font-semibold"
                                : "text-gray-700 hover:text-primary hover:bg-gray-50"
                              }
                            `}
                          >
                            <Icon className="h-6 w-6 shrink-0" />
                            {item.name}
                          </a>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 px-4 py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </div>
    </div>
  );
}
