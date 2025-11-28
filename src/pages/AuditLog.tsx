import { useMemo, useState, useCallback } from "react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { FileText, Calendar, User, FolderOpen, Activity, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent, type CalendarRange } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { fetchAuditLogs, AUDIT_MODULES, AUDIT_ACTION_TYPES, type AuditLogFilters } from "@/services/auditLog";
import { fetchStaff } from "@/services/staff";
import type { AuditLog, AuditModule, AuditActionType } from "@/types/api";

const getRangeLabel = (range: CalendarRange | undefined, fallback: string): string => {
  if (!range?.from && !range?.to) {
    return fallback;
  }

  const from = range?.from ? format(range.from, "dd MMM yyyy") : "Start";
  const to = range?.to ? format(range.to, "dd MMM yyyy") : from;

  if (from === to) {
    return from;
  }

  return `${from} – ${to}`;
};

const getActionTypeColor = (actionType: AuditActionType): string => {
  switch (actionType) {
    case "CREATED":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
    case "UPDATED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "DELETED":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800";
  }
};

const AuditLogPage = () => {
  const [dateRange, setDateRange] = useState<CalendarRange | undefined>(() => {
    const today = new Date();
    return {
      from: startOfMonth(today),
      to: today,
    };
  });
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [selectedActionType, setSelectedActionType] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { toast } = useToast();

  const filters: AuditLogFilters = useMemo(() => {
    const filters: AuditLogFilters = {};
    
    if (dateRange?.from) {
      filters.date_from = format(dateRange.from, "yyyy-MM-dd");
    }
    if (dateRange?.to) {
      filters.date_to = format(dateRange.to, "yyyy-MM-dd");
    }
    if (selectedModule !== "all") {
      filters.module = selectedModule as AuditModule;
    }
    if (selectedActionType !== "all") {
      filters.action_type = selectedActionType as AuditActionType;
    }
    if (selectedUser !== "all") {
      filters.user = selectedUser;
    }
    if (searchTerm.trim()) {
      filters.search = searchTerm.trim();
    }
    
    return filters;
  }, [dateRange, selectedModule, selectedActionType, selectedUser, searchTerm]);

  const auditLogsQuery = useQuery<AuditLog[]>({
    queryKey: ["auditLogs", filters],
    queryFn: () => fetchAuditLogs(filters),
    staleTime: 30 * 1000, // 30 seconds
  });

  const staffQuery = useQuery({
    queryKey: ["staff", "audit"],
    queryFn: () => fetchStaff(200),
    staleTime: 10 * 60 * 1000,
  });

  const uniqueUsers = useMemo(() => {
    if (!auditLogsQuery.data) return [];
    const users = new Set(auditLogsQuery.data.map((log) => log.user));
    return Array.from(users).sort();
  }, [auditLogsQuery.data]);

  const handleClearFilters = useCallback(() => {
    setDateRange({ from: startOfMonth(new Date()), to: new Date() });
    setSelectedModule("all");
    setSelectedActionType("all");
    setSelectedUser("all");
    setSearchTerm("");
  }, []);

  const auditLogs = auditLogsQuery.data ?? [];
  const isLoading = auditLogsQuery.isLoading;

  return (
    <AppLayout
      title="Audit Log"
      subtitle="Complete history of all system activities and changes"
      disableContentPadding
    >
      <div className="p-6 md:p-8 space-y-6">
        {/* Filters */}
        <Card className="p-4 md:p-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Date Range */}
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Date Range
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-12 w-full justify-start rounded-xl border-border/60 bg-background px-4 text-sm font-medium shadow-sm transition hover:bg-muted/80",
                      )}
                    >
                      {getRangeLabel(dateRange, "Select period")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      numberOfMonths={2}
                      selected={dateRange}
                      onSelect={setDateRange}
                    />
                    {(dateRange?.from || dateRange?.to) && (
                      <div className="flex justify-end border-t border-border bg-muted/40 p-2">
                        <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>
                          Clear
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Module Filter */}
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
                  <FolderOpen className="inline h-3 w-3 mr-1" />
                  Module
                </label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger className="h-12 rounded-xl border-border/60 bg-background shadow-sm">
                    <SelectValue placeholder="All Modules" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="all">All Modules</SelectItem>
                    {AUDIT_MODULES.map((module) => (
                      <SelectItem key={module} value={module}>
                        {module}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Type Filter */}
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
                  <Activity className="inline h-3 w-3 mr-1" />
                  Action Type
                </label>
                <Select value={selectedActionType} onValueChange={setSelectedActionType}>
                  <SelectTrigger className="h-12 rounded-xl border-border/60 bg-background shadow-sm">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="all">All Actions</SelectItem>
                    {AUDIT_ACTION_TYPES.map((actionType) => (
                      <SelectItem key={actionType} value={actionType}>
                        {actionType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Filter */}
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
                  <User className="inline h-3 w-3 mr-1" />
                  User
                </label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="h-12 rounded-xl border-border/60 bg-background shadow-sm">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="all">All Users</SelectItem>
                    {uniqueUsers.map((user) => (
                      <SelectItem key={user} value={user}>
                        {user}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
                <Search className="inline h-3 w-3 mr-1" />
                Search
              </label>
              <Input
                placeholder="Search by item name, ID, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 rounded-xl border-border/60 bg-background shadow-sm"
              />
            </div>

            {/* Clear Filters */}
            {(selectedModule !== "all" || 
              selectedActionType !== "all" || 
              selectedUser !== "all" || 
              searchTerm.trim() !== "" ||
              dateRange?.from || 
              dateRange?.to) && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleClearFilters} className="rounded-xl">
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Audit Log Table */}
        <Card className="overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Activity History</h2>
                <p className="text-sm text-muted-foreground">
                  {auditLogs.length} {auditLogs.length === 1 ? "entry" : "entries"} found
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Loading audit logs...</p>
              </div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-semibold text-foreground">No audit logs found</p>
              <p className="text-sm">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[120px]">User</TableHead>
                    <TableHead className="w-[120px]">Action</TableHead>
                    <TableHead className="w-[140px]">Module</TableHead>
                    <TableHead className="w-[140px]">Item ID</TableHead>
                    <TableHead className="min-w-[200px]">Item Name</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">
                        {log.timestamp}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.user}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border", getActionTypeColor(log.action_type))}>
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.module}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {log.item_id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.item_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};

export default AuditLogPage;

