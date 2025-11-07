import { Search, User } from "lucide-react";

export const Header = () => {
  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Good morning, Arnold</h1>
        <p className="text-muted-foreground">Let's take care of your finances.</p>
      </div>
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors">
          <Search className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
          <User className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
    </header>
  );
};
