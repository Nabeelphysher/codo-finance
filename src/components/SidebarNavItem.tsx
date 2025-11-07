import { LucideIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

interface SidebarNavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
}

export const SidebarNavItem = ({ to, icon: Icon, label }: SidebarNavItemProps) => {
  return (
    <NavLink
      to={to}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
      activeClassName="bg-accent text-accent-foreground"
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </NavLink>
  );
};
