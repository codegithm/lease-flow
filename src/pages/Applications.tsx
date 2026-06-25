import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateApplicationLinkDialog } from "@/components/dialogs/CreateApplicationLinkDialog";
import { toast } from "sonner";
import { getLeases } from "@/lib/api";
import {
  Users,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  Calendar,
  ArrowRight,
  FileText,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ApplicationStatus =
  | "new"
  | "in_review"
  | "pending_checks"
  | "awaiting_docs"
  | "approved"
  | "declined";

interface Application {
  id: string | number;
  applicant: {
    name: string;
    email?: string;
    phone?: string;
    initials?: string;
  };
  unit: string;
  status: ApplicationStatus;
  submittedAt?: string;
  riskScore?: number;
}

// applications will be loaded from the backend
const initialApplications: Application[] = [];

const statusConfig: Record<
  ApplicationStatus,
  {
    label: string;
    variant:
      | "default"
      | "secondary"
      | "success"
      | "warning"
      | "destructive"
      | "accent";
    icon: React.ElementType;
  }
> = {
  new: { label: "New", variant: "accent", icon: AlertCircle },
  in_review: { label: "In Review", variant: "secondary", icon: Clock },
  pending_checks: { label: "Pending Checks", variant: "warning", icon: Clock },
  awaiting_docs: { label: "Awaiting Docs", variant: "warning", icon: FileText },
  approved: { label: "Approved", variant: "success", icon: CheckCircle2 },
  declined: { label: "Declined", variant: "destructive", icon: XCircle },
};

export default function Applications() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [applications, setApplications] =
    useState<Application[]>(initialApplications);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function mapBackendStatus(s?: string): ApplicationStatus {
    const key = (s || "").toLowerCase();
    switch (key) {
      case "link_created":
        return "new";
      case "form_submitted":
        return "in_review";
      case "lease_sent":
        return "awaiting_docs";
      case "accepted":
        return "approved";
      case "declined":
        return "declined";
      default:
        return "new";
    }
  }

  // Load applications function (used for initial load and refresh)
  const loadApplications = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await getLeases();
      const mapped = (data || []).map((d: any) => {
        const name = d.tenant || "";
        const initials = name
          .split(" ")
          .map((p: string) => p[0] || "")
          .slice(0, 2)
          .join("")
          .toUpperCase();
        return {
          id: d.id,
          applicant: { name, email: undefined, phone: undefined, initials },
          unit: d.unit || "",
          status: mapBackendStatus(d.status),
          submittedAt: d.createdAt
            ? new Date(d.createdAt).toLocaleString()
            : undefined,
          riskScore: undefined,
        } as Application;
      });
      setApplications(mapped);
      if (isRefresh) {
        toast.success("Applications refreshed");
      }
    } catch (err) {
      console.error("Failed to load applications:", err);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // load applications from backend
  useEffect(() => {
    loadApplications();
  }, []);

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.applicant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.unit.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "pending" &&
        ["new", "in_review", "pending_checks", "awaiting_docs"].includes(
          app.status
        )) ||
      (activeTab === "completed" &&
        ["approved", "declined"].includes(app.status));
    return matchesSearch && matchesStatus && matchesTab;
  });

  const pipelineCounts = {
    all: applications.length,
    pending: applications.filter((a) =>
      ["new", "in_review", "pending_checks", "awaiting_docs"].includes(a.status)
    ).length,
    completed: applications.filter((a) =>
      ["approved", "declined"].includes(a.status)
    ).length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Applications</h1>
            <p className="text-muted-foreground">
              Review and manage tenant applications
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadApplications(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button variant="accent" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Application Link
            </Button>
          </div>
        </div>

        {/* Pipeline Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {loading
            ? // Loading skeletons for stats
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-12 mt-2" />
                  </CardContent>
                </Card>
              ))
            : Object.entries(statusConfig).map(([status, config]) => {
                const count = applications.filter(
                  (a) => a.status === status
                ).length;
                const StatusIcon = config.icon;
                return (
                  <Card
                    key={status}
                    className="cursor-pointer hover:border-accent/50 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {config.label}
                        </span>
                      </div>
                      <p className="text-2xl font-bold">{count}</p>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {/* Tabs & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({pipelineCounts.all})</TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pipelineCounts.pending})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({pipelineCounts.completed})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-[200px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {loading ? (
            // Loading skeletons for application cards
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-32" />
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <Skeleton className="h-3 w-12 mb-1" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                      <div className="text-center">
                        <Skeleton className="h-3 w-16 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-8 w-16 rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  No applications found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters or search query"
                    : "Create an application link to get started"}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button
                    variant="accent"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Application Link
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredApplications.map((app, index) => {
              const statusInfo = statusConfig[app.status];
              const StatusIcon = statusInfo.icon;

              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:border-accent/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Applicant Info */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-semibold text-accent">
                              {app.applicant.initials}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-lg truncate">
                              {app.applicant.name}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {app.unit}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {app.applicant.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {app.applicant.phone}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status & Score */}
                        <div className="flex items-center gap-6">
                          {app.riskScore && (
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-1">
                                Risk Score
                              </p>
                              <div
                                className={`text-lg font-bold ${
                                  app.riskScore >= 70
                                    ? "text-success"
                                    : app.riskScore >= 50
                                    ? "text-warning"
                                    : "text-destructive"
                                }`}
                              >
                                {app.riskScore}
                              </div>
                            </div>
                          )}

                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">
                              Status
                            </p>
                            <Badge
                              variant={statusInfo.variant as any}
                              className="gap-1"
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          </div>

                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">
                              Submitted
                            </p>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {app.submittedAt}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(`/applications/${app.id}`)
                              }
                            >
                              View
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/applications/${app.id}`)
                                  }
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Documents
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    toast.success("Credit check requested!")
                                  }
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Request Credit Check
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    toast.success("Application approved!")
                                  }
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() =>
                                    toast.error("Application declined.")
                                  }
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Decline
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <CreateApplicationLinkDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </DashboardLayout>
  );
}
