import { LayoutDashboard, Receipt, BarChart3, TrendingUp, Settings } from "lucide-react";
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
import { NavLink } from "@/components/NavLink";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: Receipt },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Reports", url: "/reports", icon: TrendingUp },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-xl">C</span>
          </div>
          {open && <span className="text-xl font-bold text-foreground">CODO</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className="flex items-center gap-3"
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/settings")}>
              <NavLink to="/settings" className="flex items-center gap-3">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
