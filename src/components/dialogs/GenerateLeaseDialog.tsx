import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, addMonths } from "date-fns";
import {
  FileText,
  Calendar as CalendarIcon,
  User,
  Building2,
  DollarSign,
  Send,
  Eye,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Copy,
  MessageCircle,
  Plus,
  Check,
  History,
  Download,
  Search,
  AlertTriangle,
} from "lucide-react";

interface TenantInfo {
  name: string;
  email: string;
  phone: string;
  idNumber?: string;
}

interface UnitInfo {
  id: string;
  name: string;
  address: string;
  rent: number;
  deposit: number;
}

interface LeaseTemplate {
  id: string;
  name: string;
  description?: string;
  content: string;
  isDefault?: boolean;
}

interface GenerateLeaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: TenantInfo;
  unit?: UnitInfo;
  template?: LeaseTemplate;
  applicationId?: string;
  onLeaseSent?: () => void;
}

// South African compliant lease templates
const defaultTemplates: LeaseTemplate[] = [
  {
    id: "standard-sa",
    name: "Standard Residential Lease (SA)",
    description: "CPA-compliant residential lease for South Africa",
    isDefault: true,
    content: `RESIDENTIAL LEASE AGREEMENT
(In compliance with the Consumer Protection Act 68 of 2008 and Rental Housing Act 50 of 1999)

This Lease Agreement is made on {{LEASE_START_DATE}}, between:

LANDLORD:
Name: {{LANDLORD_NAME}}
Address: {{LANDLORD_ADDRESS}}

TENANT:
Name: {{TENANT_NAME}}
ID Number: {{TENANT_ID}}
Email: {{TENANT_EMAIL}}
Phone: {{TENANT_PHONE}}

PROPERTY:
Unit: {{UNIT_NAME}}
Address: {{UNIT_ADDRESS}}

1. LEASE TERM
1.1 This lease shall commence on {{LEASE_START_DATE}} and terminate on {{LEASE_END_DATE}}.
1.2 The duration of this lease is {{LEASE_DURATION}}.

2. RENTAL
2.1 Monthly rental: R{{MONTHLY_RENT}}
2.2 Rental is due on the {{RENT_DUE_DAY}} of each month.
2.3 Late payment penalty: R{{LATE_FEE}} if paid after the 7th.
2.4 Payment method: EFT to landlord's bank account.

3. DEPOSIT
3.1 Security deposit: R{{SECURITY_DEPOSIT}}
3.2 The deposit shall be held in an interest-bearing account as per the Rental Housing Act.
3.3 Deposit plus interest shall be refunded within 14 days of lease termination, less any lawful deductions.

4. UTILITIES
4.1 Included: {{INCLUDED_UTILITIES}}
4.2 Tenant responsible for: {{TENANT_UTILITIES}}

5. OCCUPANTS
5.1 Maximum occupants: {{MAX_OCCUPANTS}}
5.2 The property may only be used for residential purposes.

6. MAINTENANCE
6.1 Tenant shall maintain the property in good condition.
6.2 Report any damage or maintenance issues within 24 hours.
6.3 Landlord is responsible for structural repairs.

7. PETS
7.1 {{PET_POLICY}}

8. INSPECTION
8.1 An incoming inspection report must be completed within 7 days of occupation.
8.2 An outgoing inspection report will be completed upon termination.

9. TERMINATION
9.1 Either party may terminate with {{NOTICE_PERIOD}} days written notice.
9.2 Early termination by tenant requires payment of {{EARLY_TERMINATION_PENALTY}}.

10. SPECIAL CONDITIONS
{{ADDITIONAL_TERMS}}

11. DISPUTE RESOLUTION
11.1 Disputes shall first be addressed through the Rental Housing Tribunal.
11.2 Jurisdiction: Magistrate's Court of the district where the property is situated.

SIGNATURES:

___________________________          Date: ____________
{{LANDLORD_NAME}} (Landlord)

___________________________          Date: ____________
{{TENANT_NAME}} (Tenant)

WITNESSES:

1. ___________________________ (Landlord's witness)

2. ___________________________ (Tenant's witness)`,
  },
  {
    id: "month-to-month",
    name: "Month-to-Month Lease",
    description: "Flexible lease with monthly renewal",
    content: `MONTH-TO-MONTH RENTAL AGREEMENT

Date: {{LEASE_START_DATE}}

LANDLORD: {{LANDLORD_NAME}}
TENANT: {{TENANT_NAME}}

PROPERTY: {{UNIT_NAME}}, {{UNIT_ADDRESS}}

TERMS:
- Monthly Rent: R{{MONTHLY_RENT}} due on the {{RENT_DUE_DAY}}
- Deposit: R{{SECURITY_DEPOSIT}}
- This agreement continues month-to-month until terminated by either party
- Termination requires {{NOTICE_PERIOD}} days written notice

{{ADDITIONAL_TERMS}}

___________________________ (Landlord)     ___________________________ (Tenant)`,
  },
  {
    id: "student",
    name: "Student Accommodation",
    description: "Lease for student housing with academic year terms",
    content: `STUDENT ACCOMMODATION LEASE AGREEMENT

This Agreement is entered into on {{LEASE_START_DATE}}

LANDLORD: {{LANDLORD_NAME}}
STUDENT TENANT: {{TENANT_NAME}}
ID Number: {{TENANT_ID}}
Email: {{TENANT_EMAIL}}

PROPERTY: {{UNIT_NAME}} at {{UNIT_ADDRESS}}

ACADEMIC YEAR TERM: {{LEASE_START_DATE}} to {{LEASE_END_DATE}}

1. RENTAL: R{{MONTHLY_RENT}} per month
2. DEPOSIT: R{{SECURITY_DEPOSIT}} (refundable)
3. INCLUDED: {{INCLUDED_UTILITIES}}

STUDENT SPECIFIC CONDITIONS:
- Proof of registration required
- Study hours policy applies (quiet hours 22:00-07:00)
- No parties without prior written approval
- Semester payment option available

{{ADDITIONAL_TERMS}}

___________________________ (Landlord)     ___________________________ (Student)`,
  },
];

// Lease version history for tracking
interface LeaseVersion {
  version: number;
  createdAt: Date;
  content: string;
  sentTo?: string;
}

export function GenerateLeaseDialog({
  open,
  onOpenChange,
  tenant,
  unit,
  template,
  applicationId,
  onLeaseSent,
}: GenerateLeaseDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<LeaseTemplate>(
    template || defaultTemplates[0],
  );
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(
    applicationId,
  );
  const [appFilter, setAppFilter] = useState("");
  const [templates, setTemplates] = useState<LeaseTemplate[]>(defaultTemplates);
  const [tenantState, setTenantState] = useState<TenantInfo | undefined>(
    tenant,
  );
  const [unitsList, setUnitsList] = useState<UnitInfo[]>([]);
  const [unitState, setUnitState] = useState<UnitInfo | undefined>(unit);
  const [unitFilter, setUnitFilter] = useState("");
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [customRent, setCustomRent] = useState(unit?.rent?.toString() || "");
  const [customDeposit, setCustomDeposit] = useState(
    unit?.deposit?.toString() || "",
  );
  const [landlordName, setLandlordName] = useState(
    "LeasePilot Property Management",
  );
  const [landlordAddress, setLandlordAddress] = useState(
    "123 Business Park, Sandton, 2196",
  );
  const [additionalTerms, setAdditionalTerms] = useState("");
  const [generatedLease, setGeneratedLease] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [leaseVersions, setLeaseVersions] = useState<LeaseVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // User search state
  const [tenantSource, setTenantSource] = useState<"application" | "search">(
    "application",
  );
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Additional lease options
  const [rentDueDay, setRentDueDay] = useState("1st");
  const [lateFee, setLateFee] = useState("250");
  const [noticePeriod, setNoticePeriod] = useState("30");
  const [maxOccupants, setMaxOccupants] = useState("2");
  const [petPolicy, setPetPolicy] = useState(
    "No pets allowed without prior written approval",
  );
  const [includedUtilities, setIncludedUtilities] = useState(
    "Water, Refuse removal",
  );
  const [tenantUtilities, setTenantUtilities] = useState(
    "Electricity, Internet, DSTV",
  );
  const [earlyTerminationPenalty, setEarlyTerminationPenalty] =
    useState("2 months rent");

  // Unsaved changes tracking
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return (
      step > 1 ||
      startDate !== undefined ||
      endDate !== undefined ||
      generatedLease !== "" ||
      additionalTerms !== "" ||
      customRent !== (unit?.rent?.toString() || "") ||
      customDeposit !== (unit?.deposit?.toString() || "")
    );
  }, [
    step,
    startDate,
    endDate,
    generatedLease,
    additionalTerms,
    customRent,
    customDeposit,
    unit,
  ]);

  // Handle dialog close with unsaved changes check
  const handleDialogClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && hasUnsavedChanges()) {
        setShowDiscardDialog(true);
        setPendingClose(true);
        return;
      }
      if (!isOpen) resetDialog();
      onOpenChange(isOpen);
    },
    [hasUnsavedChanges, onOpenChange],
  );

  const confirmDiscard = () => {
    setShowDiscardDialog(false);
    setPendingClose(false);
    resetDialog();
    onOpenChange(false);
  };

  const cancelDiscard = () => {
    setShowDiscardDialog(false);
    setPendingClose(false);
  };

  // User search function
  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    if (!query || query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      const companyId = user?.companyId;
      const api = await import("@/lib/api");
      const results = await api.searchUsers(query, companyId);
      setUserSearchResults(results || []);
    } catch (err) {
      console.warn("User search failed", err);
      setUserSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectUserFromSearch = (user: any) => {
    setTenantState({
      name:
        user.fullName ||
        `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      email: user.email,
      phone: user.cellNumber || user.phone,
      idNumber: user.idNumber,
    });
    setUserSearchResults([]);
    setUserSearchQuery("");
  };

  // Update rent/deposit when unitState changes
  useEffect(() => {
    const u = unitState || unit;
    if (u) {
      setCustomRent(u.rent?.toString() || "");
      setCustomDeposit(u.deposit?.toString() || "");
    }
  }, [unitState, unit]);

  // When dialog opens, load applications and units for selection
  useEffect(() => {
    (async () => {
      if (!open) return;
      try {
        const api = await import("@/lib/api");
        const apps = await api.getLeases();
        setApplications(apps || []);
        if (apps && apps.length === 1) {
          const only = apps[0];
          setSelectedAppId(only.id);
          try {
            const full = await api.getApplication(only.id);
            setTenantState({
              name: full.fullName,
              email: full.email,
              phone: full.cellNumber,
              idNumber: full.idNumber,
            });
          } catch (err) {}
        }
        // If an applicationId was passed in props or selected earlier, load its tenant
        const targetApp = selectedAppId || applicationId;
        if (targetApp) {
          try {
            const full = await api.getApplication(targetApp);
            setTenantState({
              name: full.fullName,
              email: full.email,
              phone: full.cellNumber,
              idNumber: full.idNumber,
            });
            setSelectedAppId(targetApp);
          } catch (err) {
            console.warn("Failed to load target application", err);
          }
        }
      } catch (err) {
        console.warn("Failed to load applications", err);
      }

      try {
        const raw = localStorage.getItem("user");
        const user = raw ? JSON.parse(raw) : null;
        const company = user?.companyName || user?.companyId;
        const api = await import("@/lib/api");
        const units = await api.getUnits(company);
        setUnitsList(units || []);
        if (units && units.length === 1) {
          setUnitState(units[0]);
        }
        // if no unit prop provided and we have units, set default local unit
        if (!unit && units && units.length > 0) {
          setUnitState(units[0]);
        }
      } catch (err) {
        console.warn("Failed to load units", err);
      }
    })();
  }, [open]);

  const selectedTenant = tenantState ?? tenant;
  const selectedUnit = unitState ?? unit;

  // Load company templates when dialog opens
  useEffect(() => {
    (async () => {
      if (!open) return;
      try {
        const raw = localStorage.getItem("user");
        const user = raw ? JSON.parse(raw) : null;
        const company = user?.companyName || user?.companyId;
        if (!company) return;
        const api = await import("@/lib/api");
        const remote = await api.getLeaseTemplates(company);
        // map remote templates to local LeaseTemplate shape
        const mapped: LeaseTemplate[] = (remote || []).map((t: any) => ({
          id: String(t.id),
          name: t.name,
          description: undefined,
          content: t.content,
          isDefault: !!t.isDefault,
        }));
        // combine company templates first, then defaults that aren't duplicated
        const defaultIds = new Set(mapped.map((m) => m.id));
        const combined = [
          ...mapped,
          ...defaultTemplates.filter((d) => !defaultIds.has(d.id)),
        ];
        setTemplates(combined);
      } catch (err) {
        console.warn("Failed to load templates", err);
      }
    })();
  }, [open]);

  const generatePersonalizedLease = () => {
    let lease = selectedTemplate.content || "";

    const replacements: Record<string, any> = {
      "{{LANDLORD_NAME}}": landlordName,
      "{{LANDLORD_ADDRESS}}": landlordAddress,
      "{{TENANT_NAME}}": selectedTenant?.name || "",
      "{{TENANT_ID}}": selectedTenant?.idNumber || "",
      "{{TENANT_EMAIL}}": selectedTenant?.email || "",
      "{{TENANT_PHONE}}": selectedTenant?.phone || "",
      "{{UNIT_NAME}}": selectedUnit?.name || "",
      "{{UNIT_ADDRESS}}": selectedUnit?.address || "",
      "{{LEASE_START_DATE}}": startDate ? format(startDate, "d MMM yyyy") : "",
      "{{LEASE_END_DATE}}": endDate ? format(endDate, "d MMM yyyy") : "",
      "{{LEASE_DURATION}}":
        startDate && endDate
          ? `${Math.round(
              (endDate.getTime() - startDate.getTime()) /
                (1000 * 60 * 60 * 24 * 30),
            )} months`
          : "",
      "{{MONTHLY_RENT}}": customRent,
      "{{SECURITY_DEPOSIT}}": customDeposit,
      "{{NOTICE_PERIOD}}": noticePeriod,
      "{{RENT_DUE_DAY}}": rentDueDay,
      "{{LATE_FEE}}": lateFee,
      "{{MAX_OCCUPANTS}}": maxOccupants,
      "{{INCLUDED_UTILITIES}}": includedUtilities,
      "{{TENANT_UTILITIES}}": tenantUtilities,
      "{{PET_POLICY}}": petPolicy,
      "{{EARLY_TERMINATION_PENALTY}}": earlyTerminationPenalty,
      "{{ADDITIONAL_TERMS}}": additionalTerms || "None",
    };

    Object.entries(replacements).forEach(([key, value]) => {
      lease = lease.replace(
        new RegExp(key.replace(/[{}]/g, "\\$&"), "g"),
        String(value),
      );
    });

    setGeneratedLease(lease);

    // Add to version history
    const newVersion: LeaseVersion = {
      version: leaseVersions.length + 1,
      createdAt: new Date(),
      content: lease,
    };
    setLeaseVersions((prev) => [...prev, newVersion]);

    setStep(3);
  };

  const handleDurationSelect = (months: number) => {
    if (!startDate) {
      const sd = new Date();
      setStartDate(sd);
      setEndDate(addMonths(sd, months));
    } else {
      setEndDate(addMonths(startDate, months));
    }
  };

  const handleSendForSignature = async () => {
    setIsSending(true);
    try {
      const targetAppId = selectedAppId || applicationId;
      if (!targetAppId) {
        throw new Error(
          "Cannot send lease without a linked application. Select an application first.",
        );
      }

      // optionally save this generated lease as a company template
      try {
        if (saveTemplate && newTemplateName) {
          const raw = localStorage.getItem("user");
          const user = raw ? JSON.parse(raw) : null;
          const company = user?.companyName || user?.companyId;
          if (company) {
            const api = await import("@/lib/api");
            await api.createLeaseTemplate({
              companyName: company,
              name: newTemplateName,
              content: generatedLease,
              createdByAgentId: user?.id,
              isDefault: false,
            });
          }
        }
      } catch (tErr) {
        console.warn("Failed to save template", tErr);
        toast.error("Failed to save template (continuing)");
      }

      // call backend to persist a draft and then send it
      const api = await import("@/lib/api");
      const gen = await api.generateLease(targetAppId, {
        content: generatedLease,
      });
      const docId = gen.document?.id || gen.document?.Id;
      const resp = await api.sendLease(targetAppId, { documentId: docId });
      // mark last version as sent
      setLeaseVersions((prev) =>
        prev.map((v, i) =>
          i === prev.length - 1 ? { ...v, sentTo: selectedTenant?.email } : v,
        ),
      );
      toast.success(
        <div className="space-y-1">
          <p className="font-medium">Lease sent successfully!</p>
          <p className="text-sm text-muted-foreground">
            Sent to {selectedTenant?.email || "tenant"}
          </p>
          <p className="text-xs text-muted-foreground">
            Document ID: {resp.document?.id || resp.document?.Id}
          </p>
        </div>,
      );
      onLeaseSent?.();
      onOpenChange(false);
      setStep(1);
    } catch (err: any) {
      console.error("Failed to send lease", err);
      toast.error(err?.message || "Failed to send lease");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendViaWhatsApp = () => {
    const targetAppId = selectedAppId || applicationId;
    if (!targetAppId) {
      toast.error("Select an application before sharing signing link");
      return;
    }
    const signingLink = `${window.location.origin}/lease-signing/${targetAppId}`;
    const message = encodeURIComponent(
      `Hi ${
        selectedTenant?.name?.split(" ")[0] || "there"
      },\n\nYour lease agreement is ready for review and signing. Please click the link below to proceed:\n\n${signingLink}\n\nBest regards,\n${landlordName}`,
    );
    const phone = selectedTenant?.phone?.replace(/[^0-9+]/g, "");
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    toast.success("Opening WhatsApp...");
  };

  const handleCopyLink = () => {
    const targetAppId = selectedAppId || applicationId;
    if (!targetAppId) {
      toast.error("Select an application before copying signing link");
      return;
    }
    const signingLink = `${window.location.origin}/lease-signing/${targetAppId}`;
    navigator.clipboard.writeText(signingLink);
    toast.success("Signing link copied to clipboard!");
  };

  const handlePreviewLease = () => {
    const targetAppId = selectedAppId || applicationId;
    if (!targetAppId) {
      toast.error("Select an application before opening lease signing");
      return;
    }
    navigate(`/lease-signing/${targetAppId}`);
    onOpenChange(false);
  };

  const handleDownloadPDF = async () => {
    try {
      const targetAppId = selectedAppId || applicationId;
      if (targetAppId) {
        const api = await import("@/lib/api");
        const gen = await api.generateLease(targetAppId, {
          content: generatedLease,
        });
        const uri =
          gen?.document?.blobUri ||
          gen?.document?.BlobUri ||
          gen?.document?.blobUri;
        if (uri) {
          window.open(uri, "_blank");
          toast.success("Opened PDF in new tab");
          return;
        }
      }

      // Fallback: download pdf in-browser (create blob from text)
      const blob = new Blob([generatedLease], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lease-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Downloaded PDF");
    } catch (err) {
      console.error("Download failed", err);
      toast.error("Failed to download PDF");
    }
  };

  const resetDialog = () => {
    setStep(1);
    setStartDate(undefined);
    setEndDate(undefined);
    setGeneratedLease("");
    setShowVersionHistory(false);
  };

  const canProceedFromStep1 =
    startDate &&
    endDate &&
    customRent &&
    (selectedTenant?.name || tenant) &&
    (selectedUnit?.id || unit);
  const canProceedFromStep2 = landlordName;

  return (
    <>
      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Discard Unsaved Changes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your lease agreement. Are you sure you
              want to close? All progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDiscard}>
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              Generate Lease Agreement
            </DialogTitle>
            <DialogDescription>
              Step {step} of 3:{" "}
              {step === 1
                ? "Select Template & Terms"
                : step === 2
                  ? "Configure Details"
                  : "Preview & Send"}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6">
            {[
              { step: 1, label: "Template & Terms" },
              { step: 2, label: "Configure Details" },
              { step: 3, label: "Preview & Send" },
            ].map((s, index) => (
              <div key={s.step} className="flex items-center flex-1">
                <div className="flex flex-col items-center min-w-[80px]">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                      step >= s.step
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {step > s.step ? <Check className="h-5 w-5" /> : s.step}
                  </div>
                  <span
                    className={cn(
                      "text-xs mt-2 text-center",
                      step === s.step
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className={cn(
                      "h-1 flex-1 mx-2 rounded",
                      step > s.step ? "bg-accent" : "bg-muted",
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Select Template & Configure Terms */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">
                  Select Lease Template
                </Label>
                <div className="grid gap-3">
                  {templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        selectedTemplate.id === tmpl.id
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/50",
                      )}
                      onClick={() => setSelectedTemplate(tmpl)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{tmpl.name}</p>
                            {tmpl.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {tmpl.description}
                          </p>
                        </div>
                        {selectedTemplate.id === tmpl.id && (
                          <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center">
                            <Check className="h-4 w-4 text-accent-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Tenant & Unit Selection */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-accent" />
                    <span className="font-medium">Tenant</span>
                  </div>

                  <Tabs
                    value={tenantSource}
                    onValueChange={(v) =>
                      setTenantSource(v as "application" | "search")
                    }
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2 mb-3">
                      <TabsTrigger value="application" className="text-xs">
                        From Application
                      </TabsTrigger>
                      <TabsTrigger value="search" className="text-xs">
                        Search User
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="application" className="mt-0">
                      <Select
                        value={selectedAppId}
                        onValueChange={async (val) => {
                          setSelectedAppId(val);
                          try {
                            const api = await import("@/lib/api");
                            const full = await api.getApplication(val);
                            setTenantState({
                              name: full.fullName,
                              email: full.email,
                              phone: full.cellNumber,
                              idNumber: full.idNumber,
                            });
                          } catch (err) {
                            console.warn("Failed to load application", err);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select from applications" />
                        </SelectTrigger>
                        <SelectContent>
                          {applications.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.tenant || a.fullName || a.email || a.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TabsContent>

                    <TabsContent value="search" className="mt-0 space-y-2">
                      <div className="relative">
                        <Input
                          placeholder="Search by name, email, or phone..."
                          value={userSearchQuery}
                          onChange={(e) => handleUserSearch(e.target.value)}
                          className="pr-8"
                        />
                        {isSearching && (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      {userSearchResults.length > 0 && (
                        <div className="max-h-40 overflow-y-auto border rounded-md">
                          {userSearchResults.map((user) => (
                            <div
                              key={user.id}
                              className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                              onClick={() => selectUserFromSearch(user)}
                            >
                              <p className="text-sm font-medium">
                                {user.fullName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  <div className="mt-3 pt-3 border-t">
                    <p className="font-semibold">
                      {selectedTenant?.name || "Not selected"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTenant?.email}
                    </p>
                    {selectedTenant?.phone && (
                      <p className="text-sm text-muted-foreground">
                        {selectedTenant?.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-accent" />
                    <span className="font-medium">Unit</span>
                  </div>
                  <Select
                    value={unitState?.id}
                    onValueChange={async (val) => {
                      try {
                        const api = await import("@/lib/api");
                        const full = await api.getUnit(val);
                        setUnitState(full);
                      } catch (err) {
                        console.warn("Failed to load unit", err);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={selectedUnit?.name || "Select unit"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {unitsList.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="mt-3">
                    <p className="font-semibold">
                      {selectedUnit?.name || "Not selected"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUnit?.address}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lease Duration */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Lease Duration</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "6 months", months: 6 },
                    { label: "1 year", months: 12 },
                    { label: "2 years", months: 24 },
                  ].map((option) => (
                    <Button
                      key={option.months}
                      variant="outline"
                      size="sm"
                      onClick={() => handleDurationSelect(option.months)}
                      className={cn(
                        endDate &&
                          startDate &&
                          Math.round(
                            (endDate.getTime() - startDate.getTime()) /
                              (1000 * 60 * 60 * 24 * 30),
                          ) === option.months
                          ? "border-accent bg-accent/10 text-accent"
                          : "",
                      )}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Financial Terms */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rent">Monthly Rent (R)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      R
                    </span>
                    <Input
                      id="rent"
                      type="number"
                      placeholder={unit?.rent?.toString()}
                      value={customRent}
                      onChange={(e) => setCustomRent(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit">Security Deposit (R)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      R
                    </span>
                    <Input
                      id="deposit"
                      type="number"
                      placeholder={unit?.deposit?.toString()}
                      value={customDeposit}
                      onChange={(e) => setCustomDeposit(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="accent"
                  onClick={() => setStep(2)}
                  disabled={!canProceedFromStep1}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Configure Details */}
          {step === 2 && (
            <div className="space-y-6">
              <Tabs defaultValue="landlord" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="landlord">Landlord Info</TabsTrigger>
                  <TabsTrigger value="terms">Lease Terms</TabsTrigger>
                  <TabsTrigger value="additional">Additional</TabsTrigger>
                </TabsList>

                <TabsContent value="landlord" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="landlord">Landlord / Company Name</Label>
                    <Input
                      id="landlord"
                      value={landlordName}
                      onChange={(e) => setLandlordName(e.target.value)}
                      placeholder="Enter landlord or company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landlord-address">Landlord Address</Label>
                    <Textarea
                      id="landlord-address"
                      value={landlordAddress}
                      onChange={(e) => setLandlordAddress(e.target.value)}
                      placeholder="Enter landlord's address"
                      className="min-h-[80px]"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="terms" className="space-y-4 mt-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rent Due Day</Label>
                      <Select value={rentDueDay} onValueChange={setRentDueDay}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1st">1st of month</SelectItem>
                          <SelectItem value="7th">7th of month</SelectItem>
                          <SelectItem value="15th">15th of month</SelectItem>
                          <SelectItem value="25th">25th of month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="late-fee">Late Payment Fee (R)</Label>
                      <Input
                        id="late-fee"
                        type="number"
                        value={lateFee}
                        onChange={(e) => setLateFee(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Notice Period (days)</Label>
                      <Select
                        value={noticePeriod}
                        onValueChange={setNoticePeriod}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="20">
                            20 days (CPA minimum)
                          </SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="occupants">Maximum Occupants</Label>
                      <Input
                        id="occupants"
                        type="number"
                        value={maxOccupants}
                        onChange={(e) => setMaxOccupants(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="early-termination">
                      Early Termination Penalty
                    </Label>
                    <Input
                      id="early-termination"
                      value={earlyTerminationPenalty}
                      onChange={(e) =>
                        setEarlyTerminationPenalty(e.target.value)
                      }
                      placeholder="e.g., 2 months rent"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="additional" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="included-utilities">
                      Included Utilities
                    </Label>
                    <Input
                      id="included-utilities"
                      value={includedUtilities}
                      onChange={(e) => setIncludedUtilities(e.target.value)}
                      placeholder="e.g., Water, Refuse removal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenant-utilities">
                      Tenant Responsible For
                    </Label>
                    <Input
                      id="tenant-utilities"
                      value={tenantUtilities}
                      onChange={(e) => setTenantUtilities(e.target.value)}
                      placeholder="e.g., Electricity, Internet"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pet-policy">Pet Policy</Label>
                    <Textarea
                      id="pet-policy"
                      value={petPolicy}
                      onChange={(e) => setPetPolicy(e.target.value)}
                      placeholder="Enter pet policy..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additional-terms">
                      Special Conditions (Optional)
                    </Label>
                    <Textarea
                      id="additional-terms"
                      placeholder="Add any additional terms or clauses..."
                      value={additionalTerms}
                      onChange={(e) => setAdditionalTerms(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Lease Summary
                </h4>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tenant:</span>
                    <span className="font-medium">{selectedTenant?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unit:</span>
                    <span className="font-medium">{selectedUnit?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="font-medium">
                      {startDate ? format(startDate, "d MMM yyyy") : "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End Date:</span>
                    <span className="font-medium">
                      {endDate ? format(endDate, "d MMM yyyy") : "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Rent:</span>
                    <span className="font-medium text-accent">
                      R{parseInt(customRent || "0").toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deposit:</span>
                    <span className="font-medium">
                      R{parseInt(customDeposit || "0").toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  variant="accent"
                  onClick={generatePersonalizedLease}
                  disabled={!canProceedFromStep2}
                >
                  Generate Lease
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview & Send */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Version History Toggle */}
              {leaseVersions.length > 1 && (
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="gap-1">
                    <History className="h-3 w-3" />
                    Version {leaseVersions.length}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVersionHistory(!showVersionHistory)}
                  >
                    {showVersionHistory ? "Hide History" : "View History"}
                  </Button>
                </div>
              )}

              {showVersionHistory && (
                <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-2">
                  <p className="text-sm font-medium">Version History</p>
                  {leaseVersions.map((v) => (
                    <div
                      key={v.version}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        Version {v.version} -{" "}
                        {format(v.createdAt, "d MMM yyyy HH:mm")}
                      </span>
                      {v.sentTo && (
                        <Badge variant="success" className="text-xs">
                          Sent to {v.sentTo}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Lease Preview */}
              <div className="p-4 rounded-lg border border-border bg-background max-h-[400px] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {generatedLease}
                </pre>
              </div>

              <div className="flex items-center gap-2 my-3">
                <Checkbox
                  id="save-template"
                  checked={saveTemplate}
                  onCheckedChange={(v) => setSaveTemplate(v as boolean)}
                />
                <Label htmlFor="save-template" className="text-sm">
                  Save this lease as a company template
                </Label>
              </div>
              {saveTemplate && (
                <div className="space-y-2 mb-3">
                  <Label>Template Name</Label>
                  <Input
                    placeholder="Template name (e.g. Standard 12-month)"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid sm:grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Edit
                </Button>
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={handlePreviewLease}>
                  <Eye className="h-4 w-4 mr-2" />
                  Open Signing Page
                </Button>
                <Button variant="outline" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Signing Link
                </Button>
                {selectedTenant?.phone && (
                  <Button variant="outline" onClick={handleSendViaWhatsApp}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send via WhatsApp
                  </Button>
                )}
                <Button
                  variant="accent"
                  onClick={handleSendForSignature}
                  disabled={isSending}
                  className="sm:col-span-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send for Signature via Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
