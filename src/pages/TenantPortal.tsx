import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Building2,
  Home,
  DollarSign,
  Calendar,
  Bell,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogOut,
  User,
  MessageSquare,
  ArrowRight,
  Plus,
  AlertCircle,
} from "lucide-react";
import {
  getApplicationByTenantUserId,
  getConversations,
  getTenantCharges,
  getUnit,
  getTenantPaymentCharges,
  initializeTenantPayment,
} from "@/lib/api";

// Tenant-facing data will come from the API. Start with empty state.
type TenantState = {
  monthlyRent: number;
  balance: number;
  nextPaymentDue?: Date | null;
  leaseEnd?: Date | null;
  payments: any[];
  fines: any[];
  communications: any[];
  totalAdditionalCharges: number;
  totalDue: number;
  currentChargeId?: string;
  additionalChargeIds: string[];
  overdueMonths: OverdueMonth[];
};

type OverdueMonth = {
  billingMonth: string;
  monthName: string;
  totalAmount: number;
  additionalCharges: any[];
  isSelected: boolean;
};

function currentBillingMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export default function TenantPortal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState<any | undefined>(undefined);
  const [unit, setUnit] = useState<any | undefined>(undefined);
  const [tenantData, setTenantData] = useState<TenantState>({
    monthlyRent: 0,
    balance: 0,
    nextPaymentDue: null,
    leaseEnd: null,
    payments: [],
    fines: [],
    communications: [],
    totalAdditionalCharges: 0,
    totalDue: 0,
    additionalChargeIds: [],
    overdueMonths: [],
  });

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        // id is the tenant's auth user ID; look up their application by tenant_user_id first
        const app = await getApplicationByTenantUserId(id);
        if (!app) {
          console.warn("No application found for tenant user", id);
          return;
        }
        setApplication(app);
        try {
          const u = await getUnit(app.unitId);
          setUnit(u);

          // Load tenant charges
          try {
            const charges = await getTenantPaymentCharges(
              app.tenantUserId || app.id,
            );
            const [allTenantCharges, conversationsResponse] = await Promise.all(
              [
                app.tenantUserId ? getTenantCharges(app.tenantUserId) : [],
                getConversations({ pageSize: 20 }),
              ],
            );

            const chargeHistory =
              allTenantCharges.length > 0
                ? allTenantCharges
                : charges.additionalCharges;

            const payments = chargeHistory
              .slice()
              .sort((a: any, b: any) => {
                const aDate = new Date(
                  a.paidAt || a.updatedAt || a.createdAt || 0,
                ).getTime();
                const bDate = new Date(
                  b.paidAt || b.updatedAt || b.createdAt || 0,
                ).getTime();
                return bDate - aDate;
              })
              .map((charge: any) => ({
                id: charge.id,
                type:
                  charge.chargeType === "fine"
                    ? "Fine"
                    : charge.chargeType === "rent"
                      ? "Monthly Rent"
                      : "Additional Charge",
                date: new Date(
                  charge.paidAt || charge.dueDate || charge.createdAt,
                ),
                amount: Number(charge.amount || 0),
                status: charge.status || "pending",
              }));

            const communications = conversationsResponse.data
              .slice(0, 20)
              .map((conversation: any) => ({
                id: conversation.id,
                subject: conversation.subject || "Conversation",
                message:
                  conversation.lastMessage?.content ||
                  "No messages yet in this conversation.",
                date: new Date(
                  conversation.updatedAt || conversation.createdAt,
                ),
                read: (conversation.unreadCount || 0) === 0,
              }));

            // Group additional charges by billing month
            const additionalChargesByMonth = charges.additionalCharges.reduce(
              (acc: any, charge: any) => {
                const month = charge.billingMonth || charges.currentMonth;
                if (!acc[month]) {
                  acc[month] = [];
                }
                acc[month].push(charge);
                return acc;
              },
              {},
            );

            // Create overdue months array
            const overdueMonths: OverdueMonth[] = Object.keys(
              additionalChargesByMonth,
            )
              .sort()
              .map((month) => {
                const monthCharges = additionalChargesByMonth[month];
                const totalAmount = monthCharges.reduce(
                  (sum: number, charge: any) => sum + charge.amount,
                  0,
                );

                // Format month name
                const [year, monthNum] = month.split("-");
                const monthDate = new Date(
                  parseInt(year),
                  parseInt(monthNum) - 1,
                );
                const monthName = monthDate.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                });

                return {
                  billingMonth: month,
                  monthName,
                  totalAmount,
                  additionalCharges: monthCharges,
                  isSelected: month === charges.currentMonth, // Auto-select current month
                };
              });

            setTenantData({
              monthlyRent: u?.rent ?? 0,
              balance: charges.totalDue,
              nextPaymentDue: charges.nextPaymentDue
                ? new Date(charges.nextPaymentDue)
                : null,
              leaseEnd: (() => {
                if (app.leaseStartDate && app.leaseDurationMonths) {
                  const d = new Date(app.leaseStartDate);
                  d.setMonth(d.getMonth() + Number(app.leaseDurationMonths));
                  return d;
                }
                return null;
              })(),
              payments,
              fines: charges.additionalCharges.filter(
                (c: any) => c.chargeType === "fine",
              ),
              communications,
              totalAdditionalCharges: charges.totalAdditionalCharges,
              totalDue: charges.totalDue,
              currentChargeId: charges.charges?.[0]?.id, // Use first pending charge
              additionalChargeIds: charges.additionalCharges
                .filter(
                  (c: any) => c.status !== "paid" && c.status !== "cancelled",
                )
                .map((c: any) => c.id),
              overdueMonths,
            });
          } catch (chargesError) {
            console.warn("Charges lookup failed", chargesError);
            // Fallback to basic data
            setTenantData((prev) => ({
              ...prev,
              monthlyRent: u?.rent ?? prev.monthlyRent ?? 0,
            }));
          }
        } catch (e) {
          console.warn("Unit lookup failed", e);
        }
      } catch (e) {
        console.warn("Application lookup failed", e);
        setApplication(undefined);
      }
    })();
  }, [id]);

  const handleMonthSelection = (billingMonth: string, isSelected: boolean) => {
    setTenantData((prev) => ({
      ...prev,
      overdueMonths: prev.overdueMonths.map((month) =>
        month.billingMonth === billingMonth ? { ...month, isSelected } : month,
      ),
    }));
  };

  const handleMakePayment = async () => {
    const selectedMonths = tenantData.overdueMonths.filter(
      (month) => month.isSelected,
    );
    if (selectedMonths.length === 0) {
      toast.error("Please select at least one month to pay for");
      return;
    }

    // Get all additional charge IDs from selected months
    const selectedChargeIds = selectedMonths.flatMap((month) =>
      month.additionalCharges.map((charge: any) => charge.id),
    );

    // Calculate total amount for selected months
    const totalAmount = selectedMonths.reduce(
      (sum, month) => sum + month.totalAmount,
      0,
    );

    try {
      const paymentData = await initializeTenantPayment({
        chargeId: tenantData.currentChargeId || null,
        additionalChargeIds: selectedChargeIds,
        paymentType: "additional_charges",
        billingMonths: selectedMonths.map((month) => month.billingMonth),
        amountInCents: Math.round(totalAmount * 100),
        paymentMethod: "card",
        callbackUrl: `${window.location.origin}/payment/callback`,
      });

      if ((paymentData as any)?.authorizationUrl) {
        window.location.href = (paymentData as any).authorizationUrl;
      } else {
        toast.error("Payment initialization failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initialize payment");
    }
  };

  const handlePayMonthlyRent = async () => {
    if (!tenantData.monthlyRent || tenantData.monthlyRent <= 0) {
      toast.error("Monthly rent amount is not available");
      return;
    }

    const billingMonth = currentBillingMonth();

    try {
      const paymentData = await initializeTenantPayment({
        chargeId: null,
        additionalChargeIds: [],
        paymentType: "rent",
        billingMonths: [billingMonth],
        amountInCents: Math.round(tenantData.monthlyRent * 100),
        paymentMethod: "card",
        callbackUrl: `${window.location.origin}/payment/callback`,
      });

      if ((paymentData as any)?.authorizationUrl) {
        window.location.href = (paymentData as any).authorizationUrl;
      } else {
        toast.error("Payment initialization failed");
      }
    } catch (error) {
      console.error("Monthly rent payment error:", error);
      toast.error("Failed to initialize monthly rent payment");
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const daysUntilPayment = tenantData?.nextPaymentDue
    ? Math.ceil(
        (tenantData.nextPaymentDue!.getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;
  const totalDue = tenantData?.totalDue ?? 0;
  const unreadComms = (tenantData?.communications ?? []).filter(
    (c: any) => !c.read,
  ).length;

  if (!application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to access your tenant portal.
            </p>
            <Button onClick={() => navigate("/")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Home className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-display font-bold">{unit?.name}</p>
                <p className="text-sm text-muted-foreground">Tenant Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadComms > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                    {unreadComms}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto py-8 px-4">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold mb-1">
                    Welcome back, {application.fullName}!
                  </h1>
                  <p className="text-muted-foreground">{unit?.address}</p>
                </div>
                <Badge
                  variant={
                    daysUntilPayment > 7
                      ? "success"
                      : daysUntilPayment > 0
                        ? "warning"
                        : "destructive"
                  }
                  className="text-sm px-4 py-1"
                >
                  {daysUntilPayment > 0
                    ? `${daysUntilPayment} days until payment`
                    : "Payment overdue!"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Next Payment
                    </p>
                    <p className="text-xl font-bold">
                      R{totalDue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="text-xl font-bold">
                      {tenantData.nextPaymentDue
                        ? formatDate(tenantData.nextPaymentDue)
                        : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      tenantData.balance > 0
                        ? "bg-destructive/20"
                        : "bg-success/20"
                    }`}
                  >
                    <CreditCard
                      className={`h-5 w-5 ${
                        tenantData.balance > 0
                          ? "text-destructive"
                          : "text-success"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Outstanding Balance
                    </p>
                    <p className="text-xl font-bold">
                      R{tenantData.balance.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lease Ends</p>
                    <p className="text-xl font-bold">
                      {tenantData.leaseEnd
                        ? formatDate(tenantData.leaseEnd)
                        : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="fines">Fines</TabsTrigger>
            <TabsTrigger value="communications" className="relative">
              Messages
              {unreadComms > 0 && (
                <span className="ml-2 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {unreadComms}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="lease">Lease</TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {tenantData.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                payment.status === "paid"
                                  ? "bg-success/20"
                                  : "bg-warning/20"
                              }`}
                            >
                              {payment.status === "paid" ? (
                                <CheckCircle2 className="h-5 w-5 text-success" />
                              ) : (
                                <Clock className="h-5 w-5 text-warning" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{payment.type}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(payment.date)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              R{payment.amount.toLocaleString()}
                            </p>
                            <Badge
                              variant={
                                payment.status === "paid"
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Make a Payment</CardTitle>
                    <CardDescription>
                      Select months to pay for. Rent must be paid before the 1st
                      of each month.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium">Payment Policy</p>
                          <p>
                            Rent payments are due before the 1st of each month.
                            If you miss a payment, you can still pay for
                            previous months, but late fees may apply.
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Month Selection */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Select Payment Periods</h4>
                      {tenantData.overdueMonths.map((month) => (
                        <div
                          key={month.billingMonth}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            month.isSelected
                              ? "border-accent bg-accent/5"
                              : "border-border hover:border-accent/50"
                          }`}
                          onClick={() =>
                            handleMonthSelection(
                              month.billingMonth,
                              !month.isSelected,
                            )
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={month.isSelected}
                                onChange={(e) =>
                                  handleMonthSelection(
                                    month.billingMonth,
                                    e.target.checked,
                                  )
                                }
                                className="rounded border-border"
                              />
                              <div>
                                <p className="font-medium">{month.monthName}</p>
                                {month.additionalCharges.length > 0 && (
                                  <p className="text-sm text-muted-foreground">
                                    {month.additionalCharges.length} additional
                                    charge(s)
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">
                                R{month.totalAmount.toLocaleString()}
                              </p>
                              {month.billingMonth !==
                                new Date().toISOString().substring(0, 7) && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Overdue
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Payment Summary */}
                    {tenantData.overdueMonths.some((m) => m.isSelected) && (
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="flex justify-between font-bold">
                          <span>Total Selected</span>
                          <span>
                            R
                            {tenantData.overdueMonths
                              .filter((m) => m.isSelected)
                              .reduce((sum, m) => sum + m.totalAmount, 0)
                              .toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="accent"
                      className="w-full"
                      onClick={handleMakePayment}
                      disabled={
                        !tenantData.overdueMonths.some((m) => m.isSelected)
                      }
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay Selected Amount
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handlePayMonthlyRent}
                      disabled={
                        !tenantData.monthlyRent || tenantData.monthlyRent <= 0
                      }
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Pay Current Monthly Rent (R
                      {tenantData.monthlyRent.toLocaleString()})
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      Payments are processed securely through Paystack
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Fines Tab */}
          <TabsContent value="fines">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Fines & Penalties
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tenantData.fines.length > 0 ? (
                  <div className="space-y-3">
                    {tenantData.fines.map((fine) => (
                      <div
                        key={fine.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                      >
                        <div>
                          <p className="font-medium">{fine.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {fine.dueDate
                              ? formatDate(new Date(fine.dueDate))
                              : "No due date"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-destructive">
                            R{fine.amount.toLocaleString()}
                          </p>
                          <Badge
                            variant={
                              fine.status === "paid" ? "success" : "warning"
                            }
                          >
                            {fine.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No fines or penalties on your account.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communications Tab */}
          <TabsContent value="communications">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-accent" />
                  Communications
                </CardTitle>
                <div className="flex gap-2">
                  <Link to="/messages">
                    <Button variant="outline" size="sm">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Report Issue
                    </Button>
                  </Link>
                  <Link to="/messages">
                    <Button variant="accent" size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      All Messages
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {tenantData.communications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium mb-2">No messages yet</p>
                    <p className="text-sm mb-4">
                      Need help? Contact your property manager
                    </p>
                    <Link to="/messages">
                      <Button variant="accent">
                        <Plus className="h-4 w-4 mr-2" />
                        Start a Conversation
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tenantData.communications.slice(0, 5).map((comm) => (
                      <Link to="/messages" key={comm.id}>
                        <div
                          className={`p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                            !comm.read
                              ? "border-accent bg-accent/5"
                              : "border-border"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{comm.subject}</p>
                                {!comm.read && (
                                  <Badge variant="accent" className="text-xs">
                                    New
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {comm.message}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(comm.date)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {tenantData.communications.length > 5 && (
                      <Link to="/messages" className="block">
                        <Button variant="outline" className="w-full">
                          View All Messages ({tenantData.communications.length})
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lease Tab */}
          <TabsContent value="lease">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  Lease Agreement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Property</p>
                    <p className="font-medium">{unit?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {unit?.address}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Lease Period
                    </p>
                    <p className="font-medium">
                      {formatDate(
                        new Date(Date.now() - 65 * 24 * 60 * 60 * 1000),
                      )}{" "}
                      -{" "}
                      {tenantData.leaseEnd
                        ? formatDate(tenantData.leaseEnd)
                        : "-"}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Monthly Rent
                    </p>
                    <p className="font-medium">
                      R{tenantData.monthlyRent.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Security Deposit
                    </p>
                    <p className="font-medium">
                      R{unit?.deposit?.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Download Lease Agreement
                </Button>
                {application?.id && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => navigate(`/invoice/${application.id}`)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Monthly Invoice &amp; Statement
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
