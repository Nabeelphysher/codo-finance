import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "grid w-full gap-2 rounded-xl border border-[hsl(var(--topbar-border))] bg-[hsl(var(--topbar-bg))] px-4 py-4 text-[hsl(var(--topbar-muted))] shadow-sm",
      "sm:flex sm:items-center sm:gap-1 sm:rounded-2xl sm:px-5 sm:py-3 md:px-6",
      className,
    )}
    style={{
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    }}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg border border-transparent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--topbar-text))] transition-colors duration-150 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--topbar-border))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:border-[hsl(var(--topbar-border))] data-[state=active]:bg-[hsl(var(--topbar-active-bg))] data-[state=active]:text-[hsl(var(--topbar-active-text))] data-[state=active]:shadow-sm",
      "sm:h-11 sm:flex-none sm:px-4 sm:text-[11.5px] sm:tracking-[0.22em] md:text-xs md:tracking-[0.26em] lg:min-w-[132px] lg:tracking-[0.3em]",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
