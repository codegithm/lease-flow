import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  FileText,
  Download,
  CheckCircle2,
  Calendar,
  Building2,
  DollarSign,
  User,
  PenLine,
  Shield,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

// Lease data comes from the backend; no preview mocks are provided.

// Loading skeleton component for lease content
function LeaseLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

// Error state component
function LeaseErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <div className="h-20 w-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-4">
          Unable to Load Lease
        </h1>
        <p className="text-muted-foreground mb-6">
          {error ||
            "There was a problem loading your lease agreement. Please try again or contact support."}
        </p>
        <div className="space-y-3">
          <Button variant="accent" className="w-full" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/")}
          >
            Return to Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function LeaseSigning() {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signature, setSignature] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const [leaseData, setLeaseData] = useState<any>(null);

  const applicationId =
    params.id ||
    searchParams.get("application") ||
    searchParams.get("register");

  // Extract load function for retry capability
  const loadLeaseData = async () => {
    if (!applicationId) {
      setError("No application specified for lease signing.");
      setLeaseData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const api = await import("@/lib/api");
      const app = await api.getApplication(applicationId);
      // Build leaseData from application
      const data = {
        id: `lease-${app.id}`,
        status: app.status || "pending_signature",
        tenant: {
          name: app.fullName || app.fullname || "",
          email: app.email || "",
          phone: app.cellNumber || "",
        },
        unit: {
          name: app.unitName || app.unitId || app.unit?.name || "",
          address: app.unitAddress || "",
        },
        terms: {
          startDate: app.leaseStart || "TBD",
          endDate: app.leaseEnd || "TBD",
          monthlyRent: app.salary || app.rent || 0,
          securityDeposit: app.deposit || 0,
          rentDueDay: "1st",
        },
        content: app.document?.content || app.document?.blobText || "",
        createdAt: app.createdAt,
        expiresAt: app.document?.expiresAt || "",
      };
      setLeaseData(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load application for lease signing", err);
      setError(err?.message || "Failed to load lease data. Please try again.");
      setLeaseData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!agreedToTerms) {
      toast.error("Please agree to the terms before signing");
      return;
    }
    if (!signature) {
      toast.error("Please enter your signature");
      return;
    }

    setIsSigning(true);
    try {
      if (!applicationId) {
        throw new Error("Missing application context for lease signing.");
      }

      const api = await import("@/lib/api");
      await api.acceptLease(applicationId, {
        email: leaseData?.tenant?.email,
      });
      setIsSigned(true);
      toast.success("Lease signed and accepted!");
    } catch (err: any) {
      console.error("Sign failed", err);
      toast.error(err?.message || "Failed to sign lease");
    } finally {
      setIsSigning(false);
    }
  };

  useEffect(() => {
    loadLeaseData();
  }, [applicationId]);

  // Show loading skeleton while data is being fetched
  if (loading) {
    return <LeaseLoadingSkeleton />;
  }

  // Show error state with retry option
  if (error && !leaseData) {
    return <LeaseErrorState error={error} onRetry={loadLeaseData} />;
  }

  if (isSigned) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="h-20 w-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-4">
            Lease Signed!
          </h1>
          <p className="text-muted-foreground mb-6">
            Thank you for signing your lease agreement. A copy has been sent to
            your email at{" "}
            <span className="font-medium text-foreground">
              {leaseData?.tenant?.email || ""}
            </span>
          </p>
          <div className="space-y-3">
            <Button
              variant="accent"
              className="w-full"
              onClick={() => toast.success("Downloading PDF...")}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Signed Lease
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/")}
            >
              Return to Home
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
              <FileText className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold">LeasePilot</h1>
              <p className="text-xs text-muted-foreground">Lease Signing</p>
            </div>
          </div>
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" />
            Expires {leaseData?.expiresAt || ""}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Lease Document */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent" />
                    Lease Agreement
                  </CardTitle>
                  <Badge variant="secondary">Review Required</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-6 max-h-[600px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed">
                    {leaseData?.content || ""}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Signing Panel */}
          <div className="space-y-6">
            {/* Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Lease Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-accent mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {leaseData?.unit?.name || ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {leaseData?.unit?.address || ""}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Start Date</span>
                      </div>
                      <span className="font-medium text-sm">
                        {leaseData?.terms?.startDate || ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">End Date</span>
                      </div>
                      <span className="font-medium text-sm">
                        {leaseData?.terms?.endDate || ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm">Monthly Rent</span>
                      </div>
                      <span className="font-bold text-sm">
                        $
                        {String(
                          leaseData?.terms?.monthlyRent ?? 0,
                        ).toLocaleString?.() ||
                          (leaseData?.terms?.monthlyRent ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Shield className="h-4 w-4" />
                        <span className="text-sm">Deposit</span>
                      </div>
                      <span className="font-medium text-sm">
                        $
                        {String(
                          leaseData?.terms?.securityDeposit ?? 0,
                        ).toLocaleString?.() ||
                          (leaseData?.terms?.securityDeposit ?? 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Signature Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PenLine className="h-5 w-5 text-accent" />
                    Sign Lease
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {leaseData?.tenant?.name || ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {leaseData?.tenant?.email || ""}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signature">
                      Type your full legal name to sign
                    </Label>
                    <Input
                      id="signature"
                      placeholder="Enter your full name"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      className="font-serif italic"
                    />
                    {signature && (
                      <div className="p-3 border border-dashed border-border rounded-lg text-center">
                        <p className="font-serif italic text-2xl">
                          {signature}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your signature
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="agree"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) =>
                        setAgreedToTerms(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="agree"
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      I have read and agree to all terms and conditions in this
                      lease agreement. I understand this is a legally binding
                      document.
                    </label>
                  </div>

                  <Button
                    variant="accent"
                    className="w-full"
                    onClick={handleSign}
                    disabled={isSigning || !agreedToTerms || !signature}
                  >
                    {isSigning ? (
                      <>
                        <div className="h-4 w-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin mr-2" />
                        Signing...
                      </>
                    ) : (
                      <>
                        <PenLine className="h-4 w-4 mr-2" />
                        Sign Lease
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By signing, you agree to the lease terms effective{" "}
                    {leaseData?.terms?.startDate || ""}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
