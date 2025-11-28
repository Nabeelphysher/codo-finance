import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  TrendingUp,
  Settings,
  ShieldCheck,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CodoLogo } from "@/components/CodoLogo";
import { cn } from "@/lib/utils";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: Receipt },
  { title: "Operations", url: "/admin", icon: ShieldCheck },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Reports", url: "/reports", icon: TrendingUp },
  { title: "Audit Log", url: "/audit-log", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { open, setOpen, isMobile } = useSidebar();
  const location = useLocation();
  const isExpanded = open || isMobile;

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOpen(window.innerWidth >= 1024);
    }
  }, [setOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setOpen]);

  return (
    <Sidebar
      collapsible="icon"
      className="flex flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]"
    >
      <SidebarHeader className="border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center justify-between gap-2 px-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-white text-primary shadow-[0_8px_20px_-12px_rgba(37,99,235,0.35)] dark:bg-[hsl(var(--sidebar-background))]">
              <CodoLogo className="h-6 w-6 shrink-0" />
            </div>
            {isExpanded && (
              <span className="text-sm font-semibold uppercase tracking-[0.4em] text-[hsl(var(--sidebar-foreground))]">
                CODO
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="hidden rounded-xl border border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-foreground))] transition hover:text-[hsl(var(--sidebar-primary))] lg:inline-flex"
              onClick={() => setOpen(!open)}
            >
              {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="space-y-6 px-2 py-5">
        <SidebarGroup className="space-y-3">
          <SidebarGroupLabel className="px-3 text-[11px] font-medium uppercase tracking-[0.3em] text-[hsl(var(--sidebar-foreground)/0.7)]">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={cn(
                      "group relative mx-1 my-0.5 rounded-2xl px-3 py-2 text-sm font-medium transition-all duration-200",
                      "hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))] data-[state=active]:bg-[hsl(var(--sidebar-primary))] data-[state=active]:text-[hsl(var(--sidebar-primary-foreground))]",
                    )}
                  >
                    <NavLink to={item.url} end={item.url === "/"} className="flex w/full items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent transition-colors",
                          isActive(item.url)
                            ? "bg-white/15 text-[hsl(var(--sidebar-primary-foreground))]"
                            : "bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground)/0.7)] group-hover:text-[hsl(var(--sidebar-primary))]",
                        )}
                      >
                        <item.icon className="h-4 w-4" strokeWidth={1.8} />
                      </div>
                      {isExpanded && (
                        <div className="flex flex-1 items-center justify-between">
                          <span className="font-medium tracking-tight">{item.title}</span>
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[hsl(var(--sidebar-foreground)/0.6)]">
                            {item.badge && (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]">
                                {item.badge}
                              </span>
                            )}
                            {item.trailing && <span>{item.trailing}</span>}
                          </div>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-[hsl(var(--sidebar-border))]">
        <div className="w-full px-3 pb-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/profile")}
                className={cn(
                  "group relative mx-1 rounded-2xl px-3 py-2 text-sm font-medium transition-colors duration-200",
                  "hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))] data-[state=active]:bg-[hsl(var(--sidebar-primary))] data-[state=active]:text-[hsl(var(--sidebar-primary-foreground))]",
                )}
              >
                <NavLink to="/profile" className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl border border-transparent transition-colors",
                      isActive("/profile")
                        ? "bg-white/15 text-[hsl(var(--sidebar-primary-foreground))]"
                        : "bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground)/0.7)] group-hover:text-[hsl(var(--sidebar-primary))]",
                    )}
                  >
                    <User className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                  {isExpanded && <span className="ml-2 font-medium tracking-tight">Profile</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
