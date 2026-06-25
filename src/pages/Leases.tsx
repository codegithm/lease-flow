import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { GenerateLeaseDialog } from "@/components/dialogs/GenerateLeaseDialog";
import { getLeases } from "@/lib/api";
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Send,
  Download,
  RefreshCw,
  XCircle,
  Calendar,
  AlertTriangle,
} from "lucide-react";

type LeaseStatus =
  | "draft"
  | "sent"
  | "signed"
  | "active"
  | "expired"
  | "terminated";

interface Lease {
  id: number;
  unit: string;
  tenant: string;
  startDate: string;
  endDate: string;
  rent: number;
  status: LeaseStatus;
  daysRemaining?: number;
}

const statusConfig: Record<
  LeaseStatus,
  {
    label: string;
    variant:
      | "default"
      | "secondary"
      | "success"
      | "warning"
      | "destructive"
      | "accent";
  }
> = {
  draft: { label: "Draft", variant: "secondary" },
  sent: { label: "Sent for Signature", variant: "accent" },
  signed: { label: "Signed", variant: "success" },
  active: { label: "Active", variant: "success" },
  expired: { label: "Expired", variant: "warning" },
  terminated: { label: "Terminated", variant: "destructive" },
};
// Start with empty leases; will load from API when available
const initialLeases: Lease[] = [];

export default function Leases() {
  const navigate = useNavigate();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [leases, setLeases] = useState<Lease[]>(initialLeases);
  const [loading, setLoading] = useState(false);

  // load leases from backend once
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getLeases();
        // backend returns objects with id, unit, tenant, rent, status, createdAt
        setLeases(
          data.map((d: any, idx: number) => ({
            id: idx + 1,
            unit: d.unit || "",
            tenant: d.tenant || "",
            startDate: d.startDate || "",
            endDate: d.endDate || "",
            rent: Number(d.rent || 0),
            status: (d.status as LeaseStatus) || ("draft" as LeaseStatus),
            daysRemaining: undefined,
          }))
        );
      } catch (e) {
        console.warn("Failed to load leases", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // compute stats from leases
  const stats = [
    {
      label: "Active Leases",
      value: leases.filter((l) => l.status === "active").length,
      icon: FileText,
      color: "text-success",
    },
    {
      label: "Expiring Soon",
      value: leases.filter(
        (l) => (l.daysRemaining ?? 0) <= 30 && (l.daysRemaining ?? 0) > 0
      ).length,
      icon: AlertTriangle,
      color: "text-warning",
    },
    {
      label: "Pending Signature",
      value: leases.filter((l) => l.status === "sent").length,
      icon: Send,
      color: "text-accent",
    },
    {
      label: "Up for Renewal",
      value: leases.filter(
        (l) => (l.daysRemaining ?? 999) <= 90 && (l.daysRemaining ?? 999) > 30
      ).length,
      icon: RefreshCw,
      color: "text-muted-foreground",
    },
  ];

  const filteredLeases = leases.filter((lease) => {
    const matchesSearch =
      lease.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lease.tenant.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || lease.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold">Leases</h1>
              <p className="text-muted-foreground">
                Manage lease agreements and renewals
              </p>
            </div>
            <Button
              variant="accent"
              onClick={() => setShowGenerateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Lease
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:border-accent/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                      </div>
                      <div
                        className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}
                      >
                        <stat.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sent">Pending Signature</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Leases Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  Lease Agreements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Rent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeases.map((lease) => (
                      <TableRow
                        key={lease.id}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">
                          {lease.unit}
                        </TableCell>
                        <TableCell>{lease.tenant}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {lease.startDate} - {lease.endDate}
                          </div>
                          {lease.daysRemaining !== undefined &&
                            lease.daysRemaining <= 60 && (
                              <p className="text-xs text-warning mt-1">
                                {lease.daysRemaining} days remaining
                              </p>
                            )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${lease.rent.toLocaleString()}/mo
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const entry = statusConfig[
                              lease.status as LeaseStatus
                            ] ?? {
                              label: String(lease.status || "Unknown"),
                              variant: "default",
                            };
                            return (
                              <Badge variant={entry.variant as any}>
                                {entry.label}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
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
                                  toast.success("Opening lease details...")
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  toast.success("Downloading PDF...")
                                }
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                              </DropdownMenuItem>
                              {lease.status === "active" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    toast.success("Starting renewal...")
                                  }
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Renew Lease
                                </DropdownMenuItem>
                              )}
                              {lease.status === "draft" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    toast.success("Sending for signature...")
                                  }
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Send for Signature
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => toast.error("Lease terminated")}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Terminate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredLeases.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">
                      No leases found
                    </h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </DashboardLayout>
      <GenerateLeaseDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        onLeaseSent={() => toast.success("Lease dialog closed")}
      />
    </>
  );
}
