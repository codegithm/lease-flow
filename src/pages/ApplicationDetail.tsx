import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Building2,
  Calendar,
  FileText,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Send,
  FileSignature,
  Loader2,
  RefreshCw,
} from "lucide-react";

// Application detail is loaded from API; no demo fallbacks here.

const statusConfig = {
  in_review: { label: "In Review", variant: "secondary" as const, icon: Clock },
  pending_checks: {
    label: "Pending Checks",
    variant: "warning" as const,
    icon: Clock,
  },
  approved: {
    label: "Approved",
    variant: "success" as const,
    icon: CheckCircle2,
  },
  declined: {
    label: "Declined",
    variant: "destructive" as const,
    icon: XCircle,
  },
  lease_sent: {
    label: "Lease Sent",
    variant: "secondary" as const,
    icon: FileText,
  },
  lease_pending_review: {
    label: "Lease Pending Review",
    variant: "warning" as const,
    icon: Clock,
  },
  lease_signed: {
    label: "Lease Signed",
    variant: "success" as const,
    icon: CheckCircle2,
  },
};

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState<any | null>(null);
  const [isRunningCreditCheck, setIsRunningCreditCheck] = useState(false);
  const [isSendingLease, setIsSendingLease] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const api = await import("@/lib/api");
        const data = await api.getApplication(id);
        // fetch unit details if present
        if (data?.unitId) {
          try {
            const unit = await api.getUnit(data.unitId);
            data.unit = unit;
          } catch (uErr) {
            console.warn("Failed to load unit for application", uErr);
          }
        }
        // Parse credit check from API response if available
        if (data?.creditCheck?.resultJson) {
          try {
            const ccResult = JSON.parse(data.creditCheck.resultJson);
            data.creditCheck = {
              score: ccResult.score ?? 0,
              checkedAt: data.creditCheck.checkedAt,
              cached: false,
            };
          } catch {
            // If parsing fails, keep the raw creditCheck
          }
        }
        setApplication(data);
      } catch (err: any) {
        console.error("Failed to load application", err);
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading)
    return (
      <DashboardLayout>
        <div>Loading…</div>
      </DashboardLayout>
    );
  if (error)
    return (
      <DashboardLayout>
        <div className="text-red-600">{error}</div>
      </DashboardLayout>
    );
  if (!application)
    return (
      <DashboardLayout>
        <div>No application found.</div>
      </DashboardLayout>
    );

  const effective = application;
  const applicant = effective.applicant ?? {
    name: effective.fullName ?? "",
    email: effective.email ?? "",
    phone: effective.cellNumber ?? "",
  };
  // prefer explicit applicant nationalId, fallback to top-level idNumber
  applicant.nationalId = applicant.nationalId || effective.idNumber || "";
  const employment = effective.employment ?? {
    employer: effective.employer ?? "",
    position: "",
    income: effective.salary ?? 0,
    duration: effective.employmentDuration ?? "",
    status: effective.employmentStatus ?? "",
  };
  const unit = effective.unit ?? { name: "", address: "", rent: 0 };
  const status =
    statusConfig[effective.status as keyof typeof statusConfig] ||
    statusConfig.in_review;
  const StatusIcon = status.icon;

  const handleApprove = () => {
    setApplication((prev: any) => ({ ...(prev || {}), status: "approved" }));
    toast.success("Application approved! Payment request sent to applicant.");
  };

  const handleDecline = () => {
    setApplication((prev: any) => ({ ...(prev || {}), status: "declined" }));
    toast.error("Application declined.");
  };

  const handleRequestCreditCheck = async () => {
    setIsRunningCreditCheck(true);
    try {
      const api = await import("@/lib/api");
      const resp = await api.requestCreditCheck(effective.id);
      const result = resp?.result || resp;
      const score = result?.score ?? 0;
      setApplication((prev: any) => ({
        ...(prev || {}),
        creditCheck: {
          score,
          checkedAt: new Date().toISOString(),
          cached: resp?.source === "cache",
          hasFullReport: !!resp?.reportData,
        },
        riskScore: score >= 700 ? 85 : score >= 600 ? 65 : 40,
      }));
      toast.success("Credit check completed successfully!");
    } catch (err: any) {
      console.error("Credit check failed", err);
      toast.error("Credit check failed: " + (err?.message || String(err)));
    } finally {
      setIsRunningCreditCheck(false);
    }
  };

  const handleSendLease = async () => {
    setIsSendingLease(true);
    try {
      const api = await import("@/lib/api");
      const resp = await api.sendLease(effective.id);
      // backend updates application status and returns document
      setApplication((prev: any) => ({
        ...(prev || {}),
        leaseStatus: "sent",
        documents: [...(prev?.documents || []), resp.document],
      }));
      const clientLink = `${window.location.origin}/apply?register=${effective.id}`;
      toast.success(
        <div className="space-y-2">
          <p>
            Lease sent to {applicant.name || effective.fullName || "client"}!
          </p>
          <p className="text-xs text-muted-foreground">Link: {clientLink}</p>
        </div>,
      );
    } catch (err: any) {
      console.error("Failed to send lease", err);
      toast.error("Failed to send lease: " + (err?.message || String(err)));
    } finally {
      setIsSendingLease(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/applications")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold">
              {applicant.name || "—"}
            </h1>
            <p className="text-muted-foreground">Application #{id}</p>
          </div>
          <Badge variant={status.variant} className="gap-1 text-sm px-3 py-1">
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Applicant Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-accent" />
                    Applicant Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{applicant.name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        National ID
                      </p>
                      <p className="font-medium">
                        {applicant.nationalId || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{applicant.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{applicant.phone || "—"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Employment */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-accent" />
                    Employment & Income
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Employer</p>
                    <p className="font-medium">{employment.employer || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="font-medium">{employment.position || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Monthly Income
                    </p>
                    <p className="font-medium">
                      $
                      {employment.income
                        ? String(employment.income).toLocaleString?.() ||
                          employment.income
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{employment.duration || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Employment Status
                    </p>
                    <p className="font-medium">{employment.status || "—"}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Documents */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent" />
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(effective.documents || []).map(
                      (doc: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg border border-border"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {doc.name ||
                                  doc.fileName ||
                                  doc.blobName ||
                                  "Document"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {doc.uploadedAt ||
                                  doc.createdAt ||
                                  doc.createdAtUtc ||
                                  ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                doc.status === "verified"
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {doc.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                try {
                                  const api = await import("@/lib/api");
                                  const dl = await api.getDocumentDownload(
                                    doc.id || doc.documentId || doc.id,
                                  );
                                  if (typeof dl === "string")
                                    window.open(dl, "_blank");
                                } catch (e) {
                                  toast.error("Failed to download document");
                                }
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* References */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>References</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(effective.references || []).map(
                      (ref: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg border border-border"
                        >
                          <div>
                            <p className="font-medium">{ref.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {ref.relationship}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {ref.phone}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Unit Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Applied Unit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{unit.name || "—"}</p>
                    <p className="text-sm text-muted-foreground">
                      {unit.address || ""}
                    </p>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Rent</span>
                    <span className="font-bold">
                      $
                      {unit.rent
                        ? String(unit.rent).toLocaleString?.() || unit.rent
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Rent-to-Income
                    </span>
                    <span className="font-medium text-success">
                      {employment.income
                        ? ((unit.rent / employment.income) * 100).toFixed(0)
                        : "—"}
                      %
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Credit Check & Risk Score */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Credit Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {effective.creditCheck ? (
                    <>
                      <div className="text-center">
                        <div
                          className={`text-5xl font-bold mb-2 ${
                            (effective.creditCheck?.score ?? 0) >= 700
                              ? "text-success"
                              : (effective.creditCheck?.score ?? 0) >= 600
                                ? "text-warning"
                                : "text-destructive"
                          }`}
                        >
                          {effective.creditCheck?.score ?? "—"}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Credit Score
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          {effective.creditCheck.cached && (
                            <Badge variant="secondary" className="text-xs">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Cached
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Checked: {effective.creditCheck.checkedAt}
                          </span>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Risk Score
                          </span>
                          <span
                            className={`font-bold ${
                              effective.riskScore && effective.riskScore >= 70
                                ? "text-success"
                                : effective.riskScore &&
                                    effective.riskScore >= 50
                                  ? "text-warning"
                                  : "text-destructive"
                            }`}
                          >
                            {effective.riskScore}/100
                          </span>
                        </div>
                        <Progress
                          value={effective.riskScore || 0}
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          {effective.riskScore && effective.riskScore >= 70
                            ? "Low Risk - Recommended"
                            : effective.riskScore && effective.riskScore >= 50
                              ? "Medium Risk - Review Recommended"
                              : "High Risk - Caution"}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleRequestCreditCheck}
                        disabled={isRunningCreditCheck}
                      >
                        {isRunningCreditCheck ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh Credit Check
                      </Button>
                      {(effective.creditCheck?.hasFullReport ||
                        effective.status === "credit_check_complete") && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            navigate(
                              `/applications/${effective.id}/credit-report`,
                            )
                          }
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Full Report
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-4xl mb-4 text-muted-foreground">
                        —
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        No credit check performed yet
                      </p>
                      <Button
                        variant="accent"
                        className="w-full"
                        onClick={handleRequestCreditCheck}
                        disabled={isRunningCreditCheck}
                      >
                        {isRunningCreditCheck ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Running Credit Check...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Run Credit Check
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Results are cached for 3 months
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {effective.status === "lease_pending_review" ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-center">
                        <Clock className="h-6 w-6 mx-auto mb-2 text-warning" />
                        <p className="text-sm font-medium text-warning">
                          Signed Lease Pending Review
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tenant has uploaded their signed lease
                        </p>
                      </div>
                      <Button
                        variant="accent"
                        className="w-full"
                        onClick={async () => {
                          setIsSendingLease(true);
                          try {
                            const api = await import("@/lib/api");
                            const updated = await api.approveSignedLease(
                              effective.id,
                            );
                            setApplication(updated);
                            toast.success("Signed lease approved!");
                          } catch (err: any) {
                            toast.error(
                              err?.message || "Failed to approve signed lease",
                            );
                          } finally {
                            setIsSendingLease(false);
                          }
                        }}
                        disabled={isSendingLease}
                      >
                        {isSendingLease ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Approve Signed Lease
                      </Button>
                    </div>
                  ) : effective.status === "lease_signed" ? (
                    <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
                      <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-success" />
                      <p className="text-sm font-medium text-success">
                        Lease Signed & Approved
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Awaiting payment
                      </p>
                    </div>
                  ) : effective.leaseStatus === "sent" ||
                    effective.status === "lease_sent" ? (
                    <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
                      <FileSignature className="h-6 w-6 mx-auto mb-2 text-success" />
                      <p className="text-sm font-medium text-success">
                        Lease Sent
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Awaiting signature
                      </p>
                    </div>
                  ) : effective.creditCheck ? (
                    <Button
                      variant="accent"
                      className="w-full"
                      onClick={handleSendLease}
                      disabled={isSendingLease}
                    >
                      {isSendingLease ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileSignature className="h-4 w-4 mr-2" />
                      )}
                      Send Lease Agreement
                    </Button>
                  ) : (
                    <Button variant="accent" className="w-full" disabled>
                      <FileSignature className="h-4 w-4 mr-2" />
                      Send Lease (Run Credit Check First)
                    </Button>
                  )}

                  <Separator />

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleApprove}
                    disabled={effective.status === "approved"}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {effective.status === "approved"
                      ? "Approved"
                      : "Approve Application"}
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Request More Documents
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleDecline}
                    disabled={effective.status === "declined"}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {effective.status === "declined"
                      ? "Declined"
                      : "Decline Application"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="h-2 w-2 rounded-full bg-accent mt-2" />
                      <div>
                        <p className="font-medium text-sm">
                          Application Submitted
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {effective.submittedAt}
                        </p>
                      </div>
                    </div>
                    {effective.creditCheck && (
                      <div className="flex gap-3">
                        <div className="h-2 w-2 rounded-full bg-accent mt-2" />
                        <div>
                          <p className="font-medium text-sm">
                            Credit Check Completed
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Score: {effective.creditCheck.score}
                          </p>
                        </div>
                      </div>
                    )}
                    {application.leaseStatus === "sent" && (
                      <div className="flex gap-3">
                        <div className="h-2 w-2 rounded-full bg-accent mt-2" />
                        <div>
                          <p className="font-medium text-sm">Lease Sent</p>
                          <p className="text-xs text-muted-foreground">
                            Awaiting signature
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <div className="h-2 w-2 rounded-full bg-accent mt-2" />
                      <div>
                        <p className="font-medium text-sm">
                          Documents Uploaded
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dec 14, 2024 at 2:45 PM
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-2 w-2 rounded-full bg-muted mt-2" />
                      <div>
                        <p className="font-medium text-sm text-muted-foreground">
                          Pending Review
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
