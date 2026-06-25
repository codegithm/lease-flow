import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import {
  CreditCard,
  DollarSign,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import {
  getCompanyPayments,
  getApplicationByTenantUserId,
  type CompanyPayment,
} from "@/lib/api";
import { useCurrency } from "@/hooks/use-currency";

type PaymentStatus = CompanyPayment["status"] | "initialized";

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "success" | "warning" | "destructive";
    icon: React.ElementType;
  }
> = {
  paid: { label: "Paid", variant: "success", icon: CheckCircle2 },
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  initialized: { label: "Initialized", variant: "secondary", icon: Clock },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  refunded: { label: "Refunded", variant: "warning", icon: RefreshCw },
};

export default function Payments() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { formatCurrency } = useCurrency();

  const {
    data: payments = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["company-payments", statusFilter],
    queryFn: () =>
      getCompanyPayments(
        statusFilter !== "all" ? { status: statusFilter } : undefined,
      ),
  });

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payment.tenantEmail || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments
    .filter((p) => p.status === "pending" || p.status === "initialized")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalFailed = payments
    .filter((p) => p.status === "failed")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  const stats = [
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      trend: "up",
      icon: DollarSign,
    },
    {
      label: "Collected",
      value: formatCurrency(totalPaid),
      trend: "up",
      icon: TrendingUp,
    },
    {
      label: "Pending",
      value: formatCurrency(totalPending),
      trend: "neutral",
      icon: Clock,
    },
    {
      label: "Failed",
      value: formatCurrency(totalFailed),
      trend: "up",
      icon: AlertTriangle,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Payments</h1>
            <p className="text-muted-foreground">
              Track tenant payments and transaction history
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
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
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                    <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <stat.icon className="h-4 w-4 text-accent" />
                    </div>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-2xl font-bold">{stat.value}</p>
                  )}
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
              placeholder="Search by tenant or reference..."
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
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="initialized">Initialized</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payments Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-accent" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => {
                      const cfg =
                        statusConfig[payment.status] ??
                        statusConfig["initialized"];
                      const StatusIcon = cfg.icon;
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            <div>{payment.tenantName}</div>
                            {payment.tenantEmail && (
                              <div className="text-xs text-muted-foreground">
                                {payment.tenantEmail}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {payment.reference}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {payment.paymentMethod || "—"}
                          </TableCell>
                          <TableCell>
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={cfg.variant as any}
                              className="gap-1"
                            >
                              <StatusIcon className="h-3 w-3" />
                              {cfg.label}
                            </Badge>
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
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      payment.reference,
                                    );
                                    toast.success("Reference copied");
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Copy Reference
                                </DropdownMenuItem>
                                {payment.status === "paid" && (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      try {
                                        const app =
                                          await getApplicationByTenantUserId(
                                            payment.tenantUserId,
                                          );
                                        if (app?.id) {
                                          const month = payment.createdAt.slice(
                                            0,
                                            7,
                                          );
                                          navigate(
                                            `/invoice/${app.id}?month=${month}`,
                                          );
                                        } else {
                                          toast.info(
                                            "No application found for this tenant",
                                          );
                                        }
                                      } catch {
                                        toast.error("Could not load invoice");
                                      }
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    View Invoice / Statement
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {!isLoading && filteredPayments.length === 0 && (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    No payments found
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your search or filters"
                      : "Payment transactions will appear here once tenants make payments"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
