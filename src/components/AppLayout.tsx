import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
}

export const AppLayout = ({ children, title, subtitle, hideHeader }: AppLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          {/* Header */}
          {!hideHeader && (
            <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-16 items-center gap-4 px-4 md:px-6">
                <SidebarTrigger className="lg:hidden" />
                
                <div className="flex-1 flex items-center justify-between">
                  {title && (
                    <div className="hidden sm:block">
                      <h1 className="text-xl md:text-2xl font-bold text-foreground">{title}</h1>
                      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 ml-auto">
                    <Button variant="ghost" size="icon" className="rounded-xl">
                      <Search className="w-5 h-5" />
                    </Button>
                    <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </header>
          )}
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
