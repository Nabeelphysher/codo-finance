import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";


interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
  fullWidth?: boolean;
}

export const AppLayout = ({ children, title, subtitle, hideHeader, fullWidth = false }: AppLayoutProps) => {
  const contentWrapperClass = fullWidth ? "mx-auto w-full" : "mx-auto w-full max-w-7xl";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col w-full">
          <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-sm md:hidden">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 text-muted-foreground hover:text-foreground md:hidden" />
                <div className="flex min-w-0 flex-col">
                  {!hideHeader && (title || subtitle) ? (
                    <>
                      {title && <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>}
                      {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
                    </>
                  ) : (
                    <span className="text-base font-semibold text-foreground">Codo Accounts</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className={contentWrapperClass}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
