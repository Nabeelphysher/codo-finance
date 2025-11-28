import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  Settings as SettingsIcon,
  User,
  Copy as CopyIcon,
  ClipboardPaste,
  Shield,
  MoonStar,
  FileText,
} from "lucide-react";


interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
  fullWidth?: boolean;
  disableContentPadding?: boolean;
  contentClassName?: string;
}

export const AppLayout = ({
  children,
  title,
  subtitle,
  hideHeader,
  fullWidth = false,
  disableContentPadding = false,
  contentClassName,
}: AppLayoutProps) => {
  const { toast } = useToast();
  const [isPrivacyModeActive, setIsPrivacyModeActive] = useState(false);
  const [contextMenuState, setContextMenuState] = useState<{ open: boolean; x: number; y: number }>({
    open: false,
    x: 0,
    y: 0,
  });
  const [clipboardHasText, setClipboardHasText] = useState(false);
  const [hasFocusableInput, setHasFocusableInput] = useState(false);
  const [selectionHasText, setSelectionHasText] = useState(false);
  const contentWrapperClass = cn(
    "mx-auto w-full",
    !fullWidth && "max-w-7xl",
    disableContentPadding ? "px-0" : "px-4 pt-4 sm:px-6 sm:pt-6 lg:px-10",
    "pb-[calc(env(safe-area-inset-bottom)+2rem)]",
    contentClassName,
  );
  const headerWrapperClass = cn(
    "mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10",
    !fullWidth && "max-w-7xl",
  );
  const navigate = useNavigate();

  const togglePrivacyMode = useCallback(() => {
    setIsPrivacyModeActive((prev) => {
      const next = !prev;
      toast({
        title: next ? "Privacy Mode ON" : "Privacy Mode OFF",
        description: "Press Shift + P to toggle.",
      });
      return next;
    });
  }, [toast]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        togglePrivacyMode();
      }
      if (event.key === "Escape") {
        setContextMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [togglePrivacyMode]);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      const menuWidth = 240;
      const menuHeight = 280;
      const margin = 12;
      const clampX = Math.min(event.clientX, window.innerWidth - menuWidth - margin);
      const clampY = Math.min(event.clientY, window.innerHeight - menuHeight - margin);
      const activeElement = document.activeElement as HTMLElement | null;
      const isFocusableInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        Boolean(activeElement?.isContentEditable);
      setHasFocusableInput(isFocusableInput);
      const selectionText = window.getSelection()?.toString() ?? "";
      setSelectionHasText(Boolean(selectionText.trim()));

      const checkClipboard = async () => {
        try {
          const text = await navigator.clipboard.readText();
          setClipboardHasText(Boolean(text));
        } catch {
          setClipboardHasText(false);
        }
      };
      checkClipboard();

      setContextMenuState({
        open: true,
        x: Math.max(margin, clampX),
        y: Math.max(margin, clampY),
      });
    };

    const handleClickClose = () => {
      setContextMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("click", handleClickClose);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("click", handleClickClose);
    };
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenuState((prev) => (prev.open ? { ...prev, open: false } : prev));
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    closeContextMenu();
  };

  const handleTogglePrivacyFromMenu = () => {
    togglePrivacyMode();
    closeContextMenu();
  };

  const handleCopySelectedText = async () => {
    try {
      const selection = window.getSelection()?.toString();
      if (selection) {
        await navigator.clipboard.writeText(selection);
        toast({ title: "Copied", description: "Selected text copied to clipboard." });
      } else {
        document.execCommand("copy");
        toast({ title: "Copied", description: "Copy command executed." });
      }
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy text. Check browser permissions.",
        variant: "destructive",
      });
    } finally {
      closeContextMenu();
    }
  };

  const handlePasteIntoActiveField = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const activeElement = document.activeElement as HTMLElement | null;
      if (!activeElement) {
        throw new Error("No active field detected.");
      }

      if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
        const start = activeElement.selectionStart ?? activeElement.value.length;
        const end = activeElement.selectionEnd ?? start;
        const value = activeElement.value;
        activeElement.value = `${value.slice(0, start)}${clipboardText}${value.slice(end)}`;
        const newCaret = start + clipboardText.length;
        activeElement.selectionStart = activeElement.selectionEnd = newCaret;
        activeElement.dispatchEvent(new Event("input", { bubbles: true }));
        toast({ title: "Pasted", description: "Content inserted into the active field." });
      } else if (activeElement.isContentEditable) {
        document.execCommand("insertText", false, clipboardText);
        toast({ title: "Pasted", description: "Content inserted into the active field." });
      } else {
        throw new Error("Focused element does not accept text.");
      }
    } catch (error) {
      toast({
        title: "Paste failed",
        description: error instanceof Error ? error.message : "Unable to paste content.",
        variant: "destructive",
      });
    } finally {
      closeContextMenu();
    }
  };

  const navigationItems = useMemo(
    () => [
      { label: "Dashboard", path: "/", icon: LayoutDashboard, shortcut: "Ctrl+1" },
      { label: "Transactions", path: "/transactions", icon: Receipt, shortcut: "Ctrl+2" },
      { label: "Operations", path: "/admin", icon: ShieldCheck, shortcut: "Ctrl+3" },
      { label: "Analytics", path: "/analytics", icon: BarChart3, shortcut: "Ctrl+4" },
      { label: "Reports", path: "/reports", icon: TrendingUp, shortcut: "Ctrl+5" },
      { label: "Audit Log", path: "/audit-log", icon: FileText, shortcut: "Ctrl+6" },
      { label: "Settings", path: "/settings", icon: SettingsIcon, shortcut: "Ctrl+7" },
      { label: "Profile", path: "/profile", icon: User, shortcut: "Ctrl+8" },
    ],
    [],
  );

  const utilityItems = useMemo(
    () => [
      {
        label: `Privacy Mode: ${isPrivacyModeActive ? "ON" : "OFF"}`,
        action: handleTogglePrivacyFromMenu,
        icon: Shield,
        shortcut: "Shift+P",
      },
      {
        label: "Copy (Selected Text)",
        action: selectionHasText ? handleCopySelectedText : undefined,
        icon: CopyIcon,
        shortcut: "Ctrl+C",
      },
      {
        label: "Paste (Into Active Field)",
        action: hasFocusableInput && clipboardHasText ? handlePasteIntoActiveField : undefined,
        icon: ClipboardPaste,
        shortcut: "Ctrl+V",
      },
      {
        label: "Dark / Light",
        action: () => {
          document.documentElement.classList.toggle("dark");
          closeContextMenu();
        },
        icon: MoonStar,
        shortcut: "Shift+S",
      },
    ],
    [
      closeContextMenu,
      handleCopySelectedText,
      handlePasteIntoActiveField,
      handleTogglePrivacyFromMenu,
      isPrivacyModeActive,
      selectionHasText,
      clipboardHasText,
      hasFocusableInput,
    ],
  );

  const showHeaderContent = !hideHeader && (title || subtitle);

  return (
    <SidebarProvider>
      <div className="relative min-h-screen w-full bg-background">
        <div
          className={cn(
            "flex min-h-screen w-full flex-col transition duration-200 lg:flex-row",
            isPrivacyModeActive && "blur-[8px]",
          )}
        >
          <AppSidebar />

          <div className="flex min-h-screen flex-1 flex-col bg-background">
            <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
              <div className={headerWrapperClass}>
                <div className="flex min-w-0 items-center gap-3">
                  <SidebarTrigger className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition hover:text-foreground lg:hidden" />
                  <div className="flex min-w-0 flex-col">
                    {showHeaderContent ? (
                      <>
                        {title && <h1 className="truncate text-base font-semibold text-foreground md:text-lg">{title}</h1>}
                        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
                      </>
                    ) : (
                      <span className="text-base font-semibold text-foreground md:text-lg">Codo Accounts</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                </div>
              </div>
            </header>

            <main className="flex-1 bg-background">
              <div className={contentWrapperClass}>{children}</div>
            </main>
          </div>
        </div>
        {isPrivacyModeActive && (
          <div aria-hidden className="pointer-events-auto absolute inset-0 z-40 bg-background/40" />
        )}
        {contextMenuState.open && (
          <div
            className="custom-context-menu fixed z-50 min-w-[150px] max-w-[75vw] rounded-2xl p-1 text-[12px] shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-90 sm:min-w-[200px]"
            style={{ top: contextMenuState.y, left: contextMenuState.x }}
            role="menu"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.4em] text-[hsl(var(--menu-muted))]">
              Navigation
            </p>
            <div className="space-y-0.5 pb-0.5">
              {navigationItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-2 py-0.5 text-left text-[10px] font-medium transition sm:text-[12px]"
                  onClick={() => handleNavigate(item.path)}
                >
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-[hsl(var(--menu-icon))]" />
                    {item.label}
                  </span>
                  <span className="text-xs text-[hsl(var(--menu-muted))]">{item.shortcut}</span>
                </button>
              ))}
            </div>
            <div className="my-1 h-px bg-white/10" />
            <p className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.4em] text-[hsl(var(--menu-muted))]">
              Utilities
            </p>
            <div className="space-y-0.5">
              {utilityItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-2 py-0.5 text-left text-[10px] font-medium transition sm:text-[12px]",
                    item.action ? "text-[hsl(var(--menu-text))]" : "cursor-not-allowed opacity-60",
                  )}
                  onClick={item.action}
                  disabled={!item.action}
                >
                  <span className="flex items-center gap-2">
                    <item.icon
                      className={cn(
                        "h-3.5 w-3.5 text-[hsl(var(--menu-icon))]",
                        !item.action && "!text-[hsl(var(--menu-disabled))]",
                      )}
                    />
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "text-xs text-[hsl(var(--menu-muted))]",
                      !item.action && "!text-[hsl(var(--menu-disabled))]",
                    )}
                  >
                    {item.shortcut}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
};
