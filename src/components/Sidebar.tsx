import { LayoutDashboard, Receipt, BarChart3, TrendingUp, Settings } from "lucide-react";
import { SidebarNavItem } from "@/components/SidebarNavItem";

export const Sidebar = () => {
  return (
    <aside className="hidden lg:flex w-64 bg-card p-6 flex-col h-screen border-r border-border fixed left-0 top-0">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">C</span>
          </div>
          <span className="text-xl font-bold text-foreground">CODO</span>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        <SidebarNavItem to="/" icon={LayoutDashboard} label="Dashboard" />
        <SidebarNavItem to="/transactions" icon={Receipt} label="Transactions" />
        <SidebarNavItem to="/analytics" icon={BarChart3} label="Analytics" />
        <SidebarNavItem to="/reports" icon={TrendingUp} label="Reports" />
      </nav>

      <div className="pt-4 border-t border-border">
        <SidebarNavItem to="/settings" icon={Settings} label="Settings" />
      </div>
    </aside>
  );
};
