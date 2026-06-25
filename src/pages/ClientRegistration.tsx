import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2,
  User,
  Briefcase,
  DollarSign,
  Clock,
  CheckCircle2,
  FileText,
  CreditCard,
  Home,
  Send,
  Loader2,
  AlertCircle,
  Download,
  Upload,
} from "lucide-react";
type ApplicationStatus =
  | "link_created"
  | "form_submitted"
  | "credit_check_pending"
  | "credit_check_complete"
  | "approved"
  | "lease_sent"
  | "lease_pending_review"
  | "lease_signed"
  | "payment_pending"
  | "active"
  | "declined";
import {
  getApplication,
  getApplicationLink,
  createApplicationFromLink,
  getUnit,
  uploadDocument,
  submitApplicationForm,
  acceptLease,
  downloadLeasePdf,
  uploadSignedLease,
  submitSignedLease,
} from "@/lib/api";
import { format, addMonths } from "date-fns";

export default function ClientRegistration() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientId = searchParams.get("register") || searchParams.get("apply");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [application, setApplication] = useState<any | null>(null);
  const [unit, setUnit] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    salary: "",
    employer: "",
    idNumber: "",
    employmentStatus: "",
    employmentDuration: "",
    country: "ZA",
  });

  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Document uploads
  const [payslipFiles, setPayslipFiles] = useState<File[]>([]);
  const [bankFiles, setBankFiles] = useState<File[]>([]);
  const [idFile, setIdFile] = useState<File | null>(null);

  // Signed lease upload
  const [signedLeaseFile, setSignedLeaseFile] = useState<File | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const statusSteps = [
    { status: "link_created", label: "Start", icon: User },
    { status: "form_submitted", label: "Submitted", icon: FileText },
    { status: "credit_check_pending", label: "Credit", icon: Clock },
    { status: "approved", label: "Approved", icon: CheckCircle2 },
    { status: "lease_sent", label: "Lease", icon: FileText },
    { status: "lease_pending_review", label: "Review", icon: Clock },
    { status: "lease_signed", label: "Signed", icon: CheckCircle2 },
    { status: "payment_pending", label: "Payment", icon: CreditCard },
    { status: "active", label: "Active", icon: Home },
    { status: "declined", label: "Declined", icon: AlertCircle },
  ];

  useEffect(() => {
    if (!clientId) {
      setIsLoading(false);
      return;
    }

    const loadUnitSafely = async (unitId?: string | null) => {
      if (!unitId) {
        setUnit(null);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        // Public registration links can be used while signed out; unit rows are
        // often protected by RLS, so skip the fetch to avoid noisy 406 errors.
        setUnit(null);
        return;
      }

      try {
        const unitData = await getUnit(unitId);
        setUnit(unitData);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message.toLowerCase() : String(err);
        const isNotFound =
          message.includes("pgrst116") ||
          message.includes("0 rows") ||
          message.includes("not acceptable");

        if (isNotFound) {
          setUnit(null);
          toast.warning(
            "Unit details are not available yet, but you can still submit your application.",
          );
          return;
        }

        throw err;
      }
    };

    const load = async () => {
      // Try to get existing application from Application API
      try {
        const app = await getApplication(clientId);
        setApplication(app);
        await loadUnitSafely(app.unitId);
        setFormData({
          email: app.email || "",
          salary: app.salary?.toString() || "",
          employer: app.employer || "",
          idNumber: app.idNumber || "",
          employmentStatus: app.employmentStatus || "",
          employmentDuration: app.employmentDuration || "",
          country: "ZA",
        });
        setCredentials((prev) => ({ ...prev, email: app.email || "" }));
        setIsLoading(false);
        return;
      } catch (e) {
        // not found - try to get link from Authentication API and create application
      }

      try {
        const link = await getApplicationLink(clientId as string);
        // create application record in Application API using same id
        const created = await createApplicationFromLink({
          id: link.id,
          fullName: link.fullName,
          cellNumber: link.cellNumber,
          unitId: link.unitId,
          status: link.status,
          requiresCreditCheck: link.requiresCreditCheck,
          agentId: link.agentId || null,
          idNumber: link.idNumber || null,
        });

        setApplication(created);
        await loadUnitSafely(created.unitId);
        setFormData({
          email: created.email || "",
          salary: created.salary?.toString() || "",
          employer: created.employer || "",
          idNumber: created.idNumber || "",
          employmentStatus: created.employmentStatus || "",
          employmentDuration: created.employmentDuration || "",
          country: "ZA",
        });
        setCredentials((prev) => ({ ...prev, email: created.email || "" }));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [clientId]);

  const handleSubmitApplication = async () => {
    if (!application) return;

    if (
      !formData.email ||
      !formData.salary ||
      !formData.employer ||
      !formData.employmentStatus
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Validate documents before submit
      const isSelfEmployed = formData.employmentStatus === "self-employed";

      if (!isSelfEmployed && (!payslipFiles || payslipFiles.length === 0)) {
        toast.error("Please upload at least one payslip (PDF)");
        setIsSubmitting(false);
        return;
      }

      const requiredBankCount = isSelfEmployed ? 6 : 3;
      // Allow either the full month count or a single combined PDF containing multiple months
      const bankCount = (bankFiles || []).length;
      if (
        bankCount === 0 ||
        (bankCount < requiredBankCount && bankCount !== 1)
      ) {
        toast.error(
          `Please upload at least ${requiredBankCount} months of bank statements (PDF) or a single combined PDF containing multiple months.`,
        );
        setIsSubmitting(false);
        return;
      }

      if (!idFile) {
        toast.error("Please upload a copy of your ID (PDF)");
        setIsSubmitting(false);
        return;
      }

      // Upload documents first
      try {
        const uploads: any[] = [];
        for (const pf of payslipFiles) {
          const resp = await uploadDocument(application.id, pf, "payslip");
          uploads.push(resp);
        }
        for (const bf of bankFiles) {
          const resp = await uploadDocument(
            application.id,
            bf,
            "bank_statement",
          );
          uploads.push(resp);
        }
        const idResp = await uploadDocument(application.id, idFile, "id_copy");
        uploads.push(idResp);
      } catch (uErr: any) {
        console.error("Document upload failed", uErr);
        toast.error("Failed to upload documents: " + (uErr?.message || uErr));
        setIsSubmitting(false);
        return;
      }

      const resp = await submitApplicationForm(application.id, {
        email: formData.email,
        salary: parseFloat(formData.salary),
        idNumber: formData.idNumber,
        employer: formData.employer,
        employmentStatus: formData.employmentStatus,
        employmentDuration: formData.employmentDuration,
      });

      setApplication(resp);
      // navigate/refresh to ensure the UI reflects the submitted step and other tabs will fetch latest state
      navigate(`/apply?register=${encodeURIComponent(resp.id)}`, {
        replace: true,
      });
      toast.success("Application submitted successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptLease = async () => {
    if (!application) return;
    setIsSubmitting(true);
    try {
      const updated = await submitApplicationForm(application.id, {
        status: "lease_signed",
      });
      setApplication(updated);
      toast.success("Lease accepted! Please create your account.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to accept lease");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!application) return;

    if (!credentials.email || !credentials.password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (credentials.password !== credentials.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (credentials.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await acceptLease(application.id, {
        email: credentials.email,
        password: credentials.password,
      });
      setApplication(updated);
      toast.success("Account created! Please sign in.");
      // redirect tenant to sign-in so they authenticate with tenant role
      navigate("/signin");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMakePayment = async () => {
    if (!application) return;
    setIsSubmitting(true);
    try {
      const updated = await submitApplicationForm(application.id, {
        status: "active",
        initialPaymentPaid: true,
      });
      setApplication(updated);
      toast.success("Payment successful! Welcome to your new home!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Payment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canRequestEdit = () => {
    if (!application) return false;
    const editableStatuses = [
      "form_submitted",
      "credit_check_pending",
      "credit_check_complete",
    ];
    // allow edit only if app is in an editable status and agent has not actioned (no AgentId)
    return (
      editableStatuses.includes(application.status) && !application.agentId
    );
  };

  const handleRequestEdit = async () => {
    if (!application) return;
    setIsSubmitting(true);
    try {
      const updated = await submitApplicationForm(application.id, {
        status: "link_created",
      });
      setApplication(updated);
      toast.success("You can now edit your application.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to enable editing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (!application) return 0;
    return statusSteps.findIndex((s) => s.status === application.status);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!clientId || !application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground mb-4">
              This application link is invalid or has expired.
            </p>
            <Button onClick={() => navigate("/")}>Go to Homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container max-w-4xl mx-auto py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-accent" />
              <span className="font-display font-bold text-lg">
                PropManager
              </span>
            </div>
            <Badge variant="secondary">Application Portal</Badge>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto py-8 px-4">
        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between overflow-x-auto pb-2">
                {statusSteps.slice(0, 6).map((step, index) => {
                  const currentIndex = getCurrentStepIndex();
                  const isCompleted = index < currentIndex;
                  const isCurrent = index === currentIndex;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.status} className="flex items-center">
                      <div className="flex flex-col items-center min-w-[80px]">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                            isCompleted
                              ? "bg-accent text-accent-foreground"
                              : isCurrent
                                ? "bg-accent/20 text-accent border-2 border-accent"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <StepIcon className="h-5 w-5" />
                          )}
                        </div>
                        <span
                          className={`text-xs mt-2 text-center ${
                            isCurrent ? "font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {index < 5 && (
                        <div
                          className={`h-0.5 w-8 mx-1 ${
                            index < currentIndex ? "bg-accent" : "bg-muted"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Application Form - Show when status is link_created */}
            {application.status === "link_created" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-accent" />
                      Complete Your Application
                    </CardTitle>
                    <CardDescription>
                      Welcome {application.fullName}! Please provide additional
                      information to complete your application.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Pre-filled info */}
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <p className="text-sm font-medium">
                        Your Information (from agent)
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name: </span>
                          <span>{application.fullName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone: </span>
                          <span>{application.cellNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Personal & Employment info form - comes BEFORE uploads */}
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="idNumber">ID Number *</Label>
                          <Input
                            id="idNumber"
                            placeholder="e.g., 9001015800083"
                            value={formData.idNumber}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                idNumber: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country *</Label>
                          <Select
                            value={formData.country}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                country: value,
                              }))
                            }
                          >
                            <SelectTrigger id="country">
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ZA">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">🇿🇦</span>
                                  <span>South Africa</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="employmentStatus">
                            Employment Status *
                          </Label>
                          <Select
                            value={formData.employmentStatus}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                employmentStatus: value as any,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employed">Employed</SelectItem>
                              <SelectItem value="self-employed">
                                Self-Employed
                              </SelectItem>
                              <SelectItem value="unemployed">
                                Unemployed
                              </SelectItem>
                              <SelectItem value="retired">Retired</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="employer">
                            {formData.employmentStatus === "self-employed"
                              ? "Business Name *"
                              : formData.employmentStatus === "retired"
                                ? "Previous Employer"
                                : "Employer *"}
                          </Label>
                          <Input
                            id="employer"
                            placeholder={
                              formData.employmentStatus === "self-employed"
                                ? "Your business name"
                                : "Company name"
                            }
                            value={formData.employer}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                employer: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="salary">
                            {formData.employmentStatus === "self-employed"
                              ? "Monthly Income (R) *"
                              : formData.employmentStatus === "retired"
                                ? "Monthly Pension (R) *"
                                : "Monthly Salary (R) *"}
                          </Label>
                          <Input
                            id="salary"
                            type="number"
                            placeholder="45000"
                            value={formData.salary}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                salary: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration">
                            {formData.employmentStatus === "self-employed"
                              ? "Years in Business"
                              : "Employment Duration"}
                          </Label>
                          <Input
                            id="duration"
                            placeholder={
                              formData.employmentStatus === "self-employed"
                                ? "e.g., 5 years"
                                : "e.g., 3 years"
                            }
                            value={formData.employmentDuration}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                employmentDuration: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Only show document uploads after employment status is selected */}
                    {formData.employmentStatus && (
                      <>
                        <Separator />

                        {/* Document uploads - appear after employment status is selected */}
                        <div className="space-y-4">
                          <h3 className="font-medium text-sm">
                            Required Documents
                          </h3>
                          <p className="text-xs text-muted-foreground -mt-2">
                            {formData.employmentStatus === "self-employed"
                              ? "As a self-employed applicant, you need to provide 6 months of bank statements and your ID."
                              : formData.employmentStatus === "retired"
                                ? "Please provide proof of pension/income, 3 months of bank statements, and your ID."
                                : formData.employmentStatus === "unemployed"
                                  ? "Please provide proof of income source, 3 months of bank statements, and your ID."
                                  : "Please provide your recent payslips, 3 months of bank statements, and your ID."}
                          </p>

                          {/* Payslip - not required for self-employed */}
                          {formData.employmentStatus !== "self-employed" && (
                            <div>
                              <Label>
                                {formData.employmentStatus === "retired"
                                  ? "Proof of Pension *"
                                  : formData.employmentStatus === "unemployed"
                                    ? "Proof of Income Source *"
                                    : "Payslip *"}
                              </Label>
                              <p className="text-xs text-muted-foreground mb-2">
                                {formData.employmentStatus === "retired"
                                  ? "Upload your pension statement or proof of retirement income."
                                  : formData.employmentStatus === "unemployed"
                                    ? "Upload proof of your income source (e.g., grant statement, support letter)."
                                    : "You may upload multiple payslip PDFs or a single combined PDF containing multiple payslips."}
                              </p>
                              <div
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const items = e.dataTransfer?.files;
                                  if (!items) return;
                                  setPayslipFiles((prev) => [
                                    ...prev,
                                    ...Array.from(items),
                                  ]);
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                className="mt-2 border border-dashed border-border rounded-md p-3 bg-card"
                              >
                                {!payslipFiles || payslipFiles.length === 0 ? (
                                  <label className="flex flex-col items-center justify-center gap-2 py-6 cursor-pointer">
                                    <FileText className="h-6 w-6 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                      Drop one or more PDFs here or click to
                                      select
                                    </span>
                                    <input
                                      type="file"
                                      accept="application/pdf"
                                      multiple
                                      className="hidden"
                                      onChange={(e) =>
                                        setPayslipFiles((prev) => [
                                          ...prev,
                                          ...(e.target.files
                                            ? Array.from(e.target.files)
                                            : []),
                                        ])
                                      }
                                    />
                                  </label>
                                ) : (
                                  <div className="space-y-2">
                                    {payslipFiles.map((f, i) => (
                                      <div
                                        key={i}
                                        className="flex items-center justify-between bg-muted p-2 rounded"
                                      >
                                        <div className="truncate">
                                          <div className="font-medium">
                                            {f.name}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {(f.size / 1024).toFixed(0)} KB
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              setPayslipFiles((prev) =>
                                                prev.filter(
                                                  (_, idx) => idx !== i,
                                                ),
                                              )
                                            }
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                    <div className="flex gap-2">
                                      <label>
                                        <input
                                          type="file"
                                          accept="application/pdf"
                                          multiple
                                          className="hidden"
                                          onChange={(e) =>
                                            setPayslipFiles((prev) => [
                                              ...prev,
                                              ...(e.target.files
                                                ? Array.from(e.target.files)
                                                : []),
                                            ])
                                          }
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                        >
                                          Add more
                                        </Button>
                                      </label>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPayslipFiles([])}
                                      >
                                        Clear all
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Bank Statements */}
                          <div>
                            <Label>Bank Statements (PDF) *</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                              Upload{" "}
                              {formData.employmentStatus === "self-employed"
                                ? "6"
                                : "3"}{" "}
                              months of bank statements. You can upload multiple
                              PDFs or a single combined PDF.
                            </p>
                            <div
                              onDrop={(e) => {
                                e.preventDefault();
                                const items = e.dataTransfer?.files;
                                if (!items) return;
                                setBankFiles((prev) => [
                                  ...prev,
                                  ...Array.from(items),
                                ]);
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              className="mt-2 border border-dashed border-border rounded-md p-3 bg-card"
                            >
                              {!bankFiles || bankFiles.length === 0 ? (
                                <label className="flex flex-col items-center justify-center gap-2 py-6 cursor-pointer">
                                  <FileText className="h-6 w-6 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">
                                    Drop one or more PDFs here or click to
                                    select
                                  </span>
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    multiple
                                    className="hidden"
                                    onChange={(e) =>
                                      setBankFiles((prev) => [
                                        ...prev,
                                        ...(e.target.files
                                          ? Array.from(e.target.files)
                                          : []),
                                      ])
                                    }
                                  />
                                </label>
                              ) : (
                                <div className="space-y-2">
                                  {bankFiles.map((f, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between bg-muted p-2 rounded"
                                    >
                                      <div className="truncate">
                                        <div className="font-medium">
                                          {f.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {(f.size / 1024).toFixed(0)} KB
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setBankFiles((prev) =>
                                              prev.filter(
                                                (_, idx) => idx !== i,
                                              ),
                                            )
                                          }
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="flex gap-2">
                                    <label>
                                      <input
                                        type="file"
                                        accept="application/pdf"
                                        multiple
                                        className="hidden"
                                        onChange={(e) =>
                                          setBankFiles((prev) => [
                                            ...prev,
                                            ...(e.target.files
                                              ? Array.from(e.target.files)
                                              : []),
                                          ])
                                        }
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                      >
                                        Add more
                                      </Button>
                                    </label>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setBankFiles([])}
                                    >
                                      Clear all
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ID Copy */}
                          <div>
                            <Label>ID Copy *</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                              Upload a clear copy of your South African ID
                              document.
                            </p>
                            <div
                              onDrop={(e) => {
                                e.preventDefault();
                                const f = e.dataTransfer?.files?.[0];
                                if (f) setIdFile(f);
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              className="mt-2 border border-dashed border-border rounded-md p-3 bg-card"
                            >
                              {!idFile ? (
                                <label className="flex flex-col items-center justify-center gap-2 py-6 cursor-pointer">
                                  <User className="h-6 w-6 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">
                                    Drop PDF here or click to select
                                  </span>
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={(e) =>
                                      setIdFile(e.target.files?.[0] ?? null)
                                    }
                                  />
                                </label>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <User className="h-5 w-5" />
                                    <div>
                                      <div className="font-medium">
                                        {idFile.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {(idFile.size / 1024).toFixed(0)} KB
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setIdFile(null)}
                                    >
                                      Remove
                                    </Button>
                                    <label>
                                      <input
                                        type="file"
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={(e) =>
                                          setIdFile(e.target.files?.[0] ?? null)
                                        }
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                      >
                                        Replace
                                      </Button>
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <Button
                      variant="accent"
                      className="w-full"
                      onClick={handleSubmitApplication}
                      disabled={isSubmitting || !formData.employmentStatus}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Application
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Waiting for review */}
            {[
              "form_submitted",
              "credit_check_pending",
              "credit_check_complete",
            ].includes(application.status) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Clock className="h-16 w-16 text-accent mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">
                      Application Under Review
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      Your application has been submitted and is being reviewed
                      by the property agent. You'll be notified once a decision
                      has been made.
                    </p>
                    <Badge variant="secondary" className="text-sm">
                      {application.requiresCreditCheck
                        ? "Credit check in progress"
                        : "Review in progress"}
                    </Badge>
                    {canRequestEdit() && (
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          onClick={handleRequestEdit}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Edit Application
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          You may edit your application while the agent has not
                          yet actioned it.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Approved - waiting for lease */}
            {application.status === "approved" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="pt-6 text-center">
                    <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">
                      Application Approved!
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      Congratulations! Your application has been approved. The
                      agent will send you a lease agreement shortly.
                    </p>
                    <Badge variant="success" className="text-sm">
                      Approved
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Lease sent - needs downloading, signing, and uploading */}
            {application.status === "lease_sent" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-accent" />
                      Sign Your Lease Agreement
                    </CardTitle>
                    <CardDescription>
                      Download, sign, and upload your lease agreement to
                      proceed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Lease Details */}
                    <div className="p-4 bg-muted rounded-lg space-y-3">
                      <h3 className="font-bold text-lg">Lease Details</h3>
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Property:
                          </span>
                          <p className="font-medium">{unit?.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {unit?.address}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Monthly Rent:
                          </span>
                          <p className="font-medium">
                            R{unit?.rent?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Security Deposit:
                          </span>
                          <p className="font-medium">
                            R{unit?.deposit?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Lease Period:
                          </span>
                          <p className="font-medium">
                            {application.leaseStartDate
                              ? `${format(
                                  new Date(application.leaseStartDate),
                                  "d MMM yyyy",
                                )} - ${format(
                                  addMonths(
                                    new Date(application.leaseStartDate),
                                    application.leaseDurationMonths || 12,
                                  ),
                                  "d MMM yyyy",
                                )}`
                              : `${
                                  application.leaseDurationMonths || 12
                                } months`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 1: Download */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-accent-foreground text-sm font-bold">
                          1
                        </div>
                        <span className="font-medium">
                          Download Lease Agreement
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-8">
                        Download the PDF, print it, sign it (initial each page),
                        and save a scan or photo of the signed document.
                      </p>
                      <Button
                        variant="outline"
                        className="ml-8"
                        onClick={async () => {
                          setIsDownloading(true);
                          try {
                            const blob = await downloadLeasePdf(application.id);
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `Lease-Agreement-${application.fullName?.replace(
                              /\s+/g,
                              "-",
                            )}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                            toast.success("Lease downloaded successfully!");
                          } catch (err: any) {
                            toast.error(
                              err?.message || "Failed to download lease",
                            );
                          } finally {
                            setIsDownloading(false);
                          }
                        }}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download Lease PDF
                      </Button>
                    </div>

                    {/* Step 2: Upload Signed Lease */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-accent-foreground text-sm font-bold">
                          2
                        </div>
                        <span className="font-medium">Upload Signed Lease</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-8">
                        Upload the signed lease document (PDF format).
                      </p>
                      <div className="ml-8">
                        {!signedLeaseFile ? (
                          <div
                            onDrop={(e) => {
                              e.preventDefault();
                              const file = e.dataTransfer?.files?.[0];
                              if (file) setSignedLeaseFile(file);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            className="border border-dashed border-border rounded-md p-4 bg-card"
                          >
                            <label className="flex flex-col items-center justify-center gap-2 py-4 cursor-pointer">
                              <Upload className="h-6 w-6 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Drop signed lease PDF here or click to select
                              </span>
                              <input
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setSignedLeaseFile(file);
                                }}
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between bg-muted p-3 rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-accent" />
                              <div>
                                <p className="font-medium text-sm">
                                  {signedLeaseFile.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(signedLeaseFile.size / 1024).toFixed(0)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSignedLeaseFile(null)}
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step 3: Submit */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-accent-foreground text-sm font-bold">
                          3
                        </div>
                        <span className="font-medium">Submit for Review</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-8">
                        Once uploaded, submit your signed lease for agent
                        review.
                      </p>
                      <Button
                        variant="accent"
                        className="ml-8 w-auto"
                        onClick={async () => {
                          if (!signedLeaseFile) {
                            toast.error(
                              "Please upload your signed lease first",
                            );
                            return;
                          }
                          setIsSubmitting(true);
                          try {
                            // Upload the signed lease
                            await uploadSignedLease(
                              application.id,
                              signedLeaseFile,
                            );
                            // Submit for review
                            const updated = await submitSignedLease(
                              application.id,
                            );
                            setApplication(updated);
                            toast.success("Signed lease submitted for review!");
                          } catch (err: any) {
                            toast.error(
                              err?.message || "Failed to submit signed lease",
                            );
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={isSubmitting || !signedLeaseFile}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Submit Signed Lease
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Lease pending review - waiting for agent approval */}
            {application.status === "lease_pending_review" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Clock className="h-16 w-16 text-warning mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">
                      Lease Under Review
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      Your signed lease has been submitted and is being reviewed
                      by the agent. You will be notified once it's approved.
                    </p>
                    <Badge variant="warning" className="text-sm">
                      Pending Review
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Create account */}
            {application.status === "lease_signed" &&
              !application.hasAccount && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-accent" />
                        Create Your Account
                      </CardTitle>
                      <CardDescription>
                        Set up your tenant account to manage payments and
                        communications.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="acc-email">Email</Label>
                        <Input
                          id="acc-email"
                          type="email"
                          value={credentials.email}
                          onChange={(e) =>
                            setCredentials((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Min 6 characters"
                          value={credentials.password}
                          onChange={(e) =>
                            setCredentials((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">
                          Confirm Password
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={credentials.confirmPassword}
                          onChange={(e) =>
                            setCredentials((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <Button
                        variant="accent"
                        className="w-full"
                        onClick={handleCreateAccount}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <User className="h-4 w-4 mr-2" />
                        )}
                        Create Account
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

            {/* Initial payment */}
            {application.status === "payment_pending" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-accent" />
                      Initial Payment Required
                    </CardTitle>
                    <CardDescription>
                      Complete your initial payment to finalize your tenancy.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span>First Month's Rent</span>
                        <span className="font-medium">
                          R{unit?.rent?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Security Deposit</span>
                        <span className="font-medium">
                          R{unit?.deposit?.toLocaleString()}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Due</span>
                        <span>
                          R
                          {(
                            (unit?.rent || 0) + (unit?.deposit || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="accent"
                      className="w-full"
                      onClick={handleMakePayment}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Pay R
                          {(
                            (unit?.rent || 0) + (unit?.deposit || 0)
                          ).toLocaleString()}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Active tenant */}
            {application.status === "active" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Home className="h-16 w-16 text-success mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Welcome Home!</h2>
                    <p className="text-muted-foreground mb-4">
                      Your tenancy is now active. Access your tenant portal to
                      manage payments and view communications.
                    </p>
                    <Button
                      variant="accent"
                      onClick={() =>
                        navigate(`/tenant-portal/${application.id}`)
                      }
                    >
                      Go to Tenant Portal
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Declined */}
            {application.status === "declined" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="pt-6 text-center">
                    <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">
                      Application Declined
                    </h2>
                    <p className="text-muted-foreground">
                      Unfortunately, your application was not approved. Please
                      contact the property manager for more information.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar - Unit Info */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-accent" />
                    Property Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-semibold text-lg">{unit?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {unit?.address}
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Monthly Rent
                      </span>
                      <span className="font-bold">
                        R{unit?.rent?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deposit</span>
                      <span className="font-medium">
                        R{unit?.deposit?.toLocaleString()}
                      </span>
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
                <CardHeader>
                  <CardTitle className="text-lg">Need Help?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Contact the property agent if you have any questions about
                    your application.
                  </p>
                  <Button variant="outline" className="w-full">
                    Contact Agent
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
