import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Transactions from "./pages/Transactions";
import Admin from "./pages/Admin";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import Reports from "./pages/Reports";
import AuditLog from "./pages/AuditLog";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit-log" element={<AuditLog />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
