import { Home, Wallet, TrendingUp, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const NavItem = ({ icon, label, active }: NavItemProps) => (
  <button
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left",
      active
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
    )}
  >
    <span className="text-xl">{icon}</span>
    <span className="font-medium">{label}</span>
  </button>
);

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-card p-6 flex flex-col h-screen border-r border-border">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">C</span>
          </div>
          <span className="text-xl font-bold text-foreground">CODO</span>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        <NavItem icon={<Home />} label="Home" active />
        <NavItem icon={<Wallet />} label="Wallets" />
        <NavItem icon={<TrendingUp />} label="Insights" />
        <NavItem icon={<MessageSquare />} label="Chats" />
      </nav>

      <div className="pt-4 border-t border-border">
        <NavItem icon={<Settings />} label="Settings" />
      </div>
    </aside>
  );
};
