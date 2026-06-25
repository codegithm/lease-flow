import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Printer, Download, ArrowLeft } from "lucide-react";
import {
  getApplication,
  getUnit,
  getCurrentUser,
  uploadDocument,
  getDocumentDownload,
  getCompanyBankingDetails,
  getCompanyChargeConfigs,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useCurrency } from "@/hooks/use-currency";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  date: string;
  allocation: string;
  remarks: string;
  exclusive: number;
  tax: number;
  inclusive: number;
}

interface AgingBucket {
  label: string;
  amount: number;
}

interface InvoiceData {
  // Entity (company)
  entityName: string;
  entityVatNo?: string;
  entityRegNo?: string;
  entityAddress?: string;
  entityEmail?: string;
  entityPhone?: string;
  // Banking
  bankName?: string;
  bankAccountHolder?: string;
  bankAccountNo?: string;
  bankBranchCode?: string;
  bankBranchName?: string;
  paymentReference?: string;
  // Recipient (tenant)
  recipientName: string;
  recipientAddress?: string;
  recipientVatNo?: string;
  recipientRegNo?: string;
  // Property
  propertyName: string;
  unitNo: string;
  deposit: number;
  bankGuarantee: number;
  // Invoice meta
  statementDate: string;
  invoiceNo: string;
  forMonth: string;
  // Line items
  items: LineItem[];
  // Aging
  aging: AgingBucket[];
  // Totals
  arrearsOrPrepaid: number;
  currentMonthCharges: number;
  amountDue: number;
}

interface StoredInvoiceDoc {
  id: string;
  fileName: string;
  createdAt?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n === 0
    ? "0.00"
    : n.toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

function currentMonthLabel(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthDisplay(ym: string) {
  const [year, month] = ym.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

function pad(n: number) {
  return String(n).padStart(6, "0");
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function InvoiceStatement() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [searchParams] = useSearchParams();
  const billingMonth = searchParams.get("month") || currentMonthLabel();
  const printRef = useRef<HTMLDivElement>(null);
  const { formatCurrency } = useCurrency();

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPdf, setSavingPdf] = useState(false);
  const [storedInvoiceDoc, setStoredInvoiceDoc] =
    useState<StoredInvoiceDoc | null>(null);

  useEffect(() => {
    if (!applicationId) return;
    buildInvoice(applicationId, billingMonth)
      .then(setInvoice)
      .catch((e) => {
        console.error(e);
        toast.error("Failed to load invoice data");
      })
      .finally(() => setLoading(false));
  }, [applicationId, billingMonth]);

  useEffect(() => {
    if (!applicationId) return;
    void loadStoredInvoice(applicationId, billingMonth).then(
      setStoredInvoiceDoc,
    );
  }, [applicationId, billingMonth]);

  const handlePrint = () => window.print();

  const handleSaveAndStorePdf = async () => {
    if (!applicationId) {
      toast.error("Missing application ID");
      return;
    }
    if (!printRef.current) {
      toast.error("Invoice is not ready yet");
      return;
    }

    setSavingPdf(true);
    try {
      const pdfBlob = await generatePdfBlobFromElement(printRef.current);
      const fileName = `invoice-${billingMonth}-${applicationId.slice(0, 8)}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      const documentType = `invoice_statement_pdf:${billingMonth}`;

      const uploaded = await uploadDocument(applicationId, file, documentType);
      setStoredInvoiceDoc({
        id: uploaded.id,
        fileName: uploaded.fileName,
        createdAt: uploaded.createdAt,
      });

      const downloadUrl = await getDocumentDownload(uploaded.id).catch(
        () => null,
      );
      if (typeof downloadUrl === "string") {
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
      }
      toast.success("Invoice PDF stored successfully");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to generate/store invoice PDF");
    } finally {
      setSavingPdf(false);
    }
  };

  const handleOpenStoredInvoice = async () => {
    if (!storedInvoiceDoc?.id) return;
    try {
      const signedUrl = await getDocumentDownload(storedInvoiceDoc.id);
      if (typeof signedUrl === "string") {
        window.open(signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Failed to open stored invoice");
    }
  };

  // ── Derive display values ──
  const invoiceNo = invoice
    ? `LF${new Date(invoice.statementDate).getFullYear()}/${pad(
        parseInt(applicationId?.slice(0, 4) ?? "1", 16) % 999999,
      )}`
    : "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Invoice data not available.</p>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar – hidden on print */}
      <div className="no-print sticky top-0 z-50 bg-white border-b px-6 py-3 flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button
          variant="accent"
          size="sm"
          onClick={handleSaveAndStorePdf}
          disabled={savingPdf}
        >
          <Download className="h-4 w-4 mr-2" />
          {savingPdf ? "Saving..." : "Save & Store PDF"}
        </Button>
        {storedInvoiceDoc && (
          <Button variant="outline" size="sm" onClick={handleOpenStoredInvoice}>
            Open Stored PDF
          </Button>
        )}
      </div>

      {/* Invoice body */}
      <div
        ref={printRef}
        className="invoice-page bg-white mx-auto my-8 no-print:shadow-lg"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "14mm 16mm",
          fontFamily: "Arial, sans-serif",
          fontSize: "10pt",
          color: "#222",
        }}
      >
        {/* ── Header ── */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 16,
          }}
        >
          <tbody>
            <tr>
              <td style={{ verticalAlign: "top", width: "50%" }}>
                {/* Logo placeholder – swap <img> for real logo */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: "50%",
                      background: "#1a56db",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{ color: "#fff", fontWeight: 700, fontSize: 22 }}
                    >
                      LF
                    </span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                      {invoice.entityName}
                    </div>
                    <div style={{ fontSize: 9, color: "#555" }}>
                      Property Management
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>
                  Tax Invoice &amp; Statement
                </div>
                <div style={{ marginTop: 12, fontSize: 9, lineHeight: 1.7 }}>
                  <b>{invoice.recipientName}</b>
                  <br />
                  {invoice.propertyName}
                  <br />
                  {invoice.recipientAddress}
                </div>
              </td>
              <td
                style={{ verticalAlign: "top", width: "50%", paddingLeft: 20 }}
              >
                <EntityGrid label="Entity" value={invoice.entityName} />
                <EntityGrid
                  label="Entity VAT No."
                  value={invoice.entityVatNo}
                />
                <EntityGrid
                  label="Entity Registration No."
                  value={invoice.entityRegNo}
                />
                <div style={{ height: 8 }} />
                <EntityGrid
                  label="Property"
                  value={invoice.propertyName}
                  secondLabel="Unit No."
                  secondValue={invoice.unitNo}
                />
                <EntityGrid
                  label="Recipient VAT No."
                  value={invoice.recipientVatNo || "—"}
                  secondLabel="Recipient Registration No."
                  secondValue={invoice.recipientRegNo || "—"}
                />
                <EntityGrid
                  label="Deposit"
                  value={fmt(invoice.deposit)}
                  secondLabel="Bank Guarantee"
                  secondValue={fmt(invoice.bankGuarantee)}
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Statement meta bar ── */}
        <div
          style={{
            borderTop: "1.5px solid #1a56db",
            borderBottom: "1.5px solid #1a56db",
            padding: "5px 0",
            display: "flex",
            gap: 24,
            fontSize: 9,
            marginBottom: 10,
          }}
        >
          <span>
            <b>Statement Date:</b> {invoice.statementDate}
          </span>
          <span style={{ color: "#1a56db" }}>
            <b>Tax Invoice No:</b> {invoiceNo}
          </span>
          <span style={{ color: "#1a56db" }}>
            <b>For the Month:</b> {formatMonthDisplay(billingMonth)}
          </span>
        </div>

        {/* ── Line items table ── */}
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}
        >
          <thead>
            <tr style={{ background: "#f0f4fb" }}>
              <Th w={60}>Date</Th>
              <Th w={100}>Allocation</Th>
              <Th>Remarks</Th>
              <Th w={70} align="right">
                Exclusive
              </Th>
              <Th w={55} align="right">
                Tax
              </Th>
              <Th w={80} align="right">
                Inclusive
              </Th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr
                key={i}
                style={{ background: i % 2 === 0 ? "#fff" : "#fafbfd" }}
              >
                <Td>{item.date}</Td>
                <Td
                  style={{ color: item.inclusive < 0 ? "#1a56db" : undefined }}
                >
                  {item.allocation}
                </Td>
                <Td>{item.remarks}</Td>
                <Td align="right">
                  {item.exclusive === 0 ? "" : fmt(item.exclusive)}
                </Td>
                <Td align="right">{item.tax === 0 ? "0.00" : fmt(item.tax)}</Td>
                <Td
                  align="right"
                  style={{ color: item.inclusive < 0 ? "#1a56db" : undefined }}
                >
                  {fmt(Math.abs(item.inclusive))}
                  {item.inclusive < 0 ? " CR" : ""}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ height: 16 }} />

        {/* ── Bottom section: banking left, totals right ── */}
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}
        >
          <tbody>
            <tr>
              <td
                style={{ verticalAlign: "top", width: "55%", paddingRight: 20 }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Banking Details
                </div>
                {invoice.bankAccountHolder && (
                  <div>{invoice.bankAccountHolder}</div>
                )}
                {invoice.bankName && <div>{invoice.entityName}</div>}
                {invoice.bankName && (
                  <div>Account Number: {invoice.bankAccountNo}</div>
                )}
                {invoice.bankBranchCode && (
                  <div>Branch: {invoice.bankBranchCode}</div>
                )}
                {invoice.paymentReference && (
                  <div style={{ marginTop: 4 }}>
                    Reference: {invoice.paymentReference}
                  </div>
                )}
              </td>
              <td style={{ verticalAlign: "top", width: "45%" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <SummaryRow
                      label="Arrears/Prepaid"
                      value={fmt(invoice.arrearsOrPrepaid)}
                    />
                    <SummaryRow
                      label="Current Month Charges"
                      value={fmt(invoice.currentMonthCharges)}
                    />
                    <tr>
                      <td
                        style={{
                          padding: "4px 8px",
                          fontWeight: 700,
                          fontSize: 10,
                        }}
                      >
                        Amount Due
                      </td>
                      <td
                        style={{
                          padding: "4px 8px",
                          textAlign: "right",
                          fontWeight: 700,
                          fontSize: 12,
                          color: "#1a56db",
                          borderTop: "1.5px solid #1a56db",
                        }}
                      >
                        R{fmt(invoice.amountDue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <Separator style={{ margin: "12px 0", borderColor: "#ddd" }} />

        {/* ── Queries + Aging ── */}
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  width: "35%",
                  verticalAlign: "top",
                  background: "#f0f4fb",
                  padding: "6px 8px",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Queries</div>
                {invoice.entityEmail && <div>{invoice.entityEmail}</div>}
                {invoice.entityPhone && <div>{invoice.entityPhone}</div>}
              </td>
              <td style={{ width: "65%", verticalAlign: "top" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "center",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f0f4fb" }}>
                      {invoice.aging.map((b) => (
                        <th
                          key={b.label}
                          style={{ padding: "4px 6px", fontWeight: 600 }}
                        >
                          {b.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {invoice.aging.map((b) => (
                        <td key={b.label} style={{ padding: "4px 6px" }}>
                          {fmt(b.amount)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Bank details row ── */}
        {invoice.bankName && (
          <>
            <Separator style={{ margin: "12px 0", borderColor: "#ddd" }} />
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}
            >
              <thead>
                <tr style={{ background: "#f0f4fb" }}>
                  <Th>Tenant Name</Th>
                  <Th>Bank</Th>
                  <Th>Branch No.</Th>
                  <Th>Branch Name</Th>
                  <Th>Account No.</Th>
                  <Th
                    align="right"
                    style={{ background: "#1a56db", color: "#fff" }}
                  >
                    Payment Reference
                  </Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td>{invoice.recipientName}</Td>
                  <Td>{invoice.bankName}</Td>
                  <Td>{invoice.bankBranchCode}</Td>
                  <Td>{invoice.bankBranchName}</Td>
                  <Td>{invoice.bankAccountNo}</Td>
                  <Td align="right" style={{ fontWeight: 700 }}>
                    {invoice.paymentReference}
                  </Td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* ── Footer ── */}
        <div
          style={{
            marginTop: 24,
            borderTop: "1px solid #ddd",
            paddingTop: 8,
            fontSize: 8,
            color: "#777",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>
            Printed: {invoice.statementDate} &nbsp;|&nbsp; LeaseFlow Property
            Management Platform
          </span>
          <span>Page 1 of 1</span>
        </div>
      </div>

      {/* Print-only global styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .invoice-page { margin: 0 !important; box-shadow: none !important; width: 100% !important; }
        }
      `}</style>
    </>
  );
}

// ─── Small layout helpers ─────────────────────────────────────────────────────

function Th({
  children,
  w,
  align,
  style,
}: {
  children?: React.ReactNode;
  w?: number;
  align?: "left" | "right" | "center";
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        padding: "4px 6px",
        textAlign: align || "left",
        fontWeight: 600,
        borderBottom: "1px solid #ddd",
        width: w,
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  style,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: "3px 6px",
        textAlign: align || "left",
        borderBottom: "1px solid #f0f0f0",
        ...style,
      }}
    >
      {children}
    </td>
  );
}

function EntityGrid({
  label,
  value,
  secondLabel,
  secondValue,
}: {
  label: string;
  value?: string | null;
  secondLabel?: string;
  secondValue?: string | null;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: secondLabel ? "1fr 1fr" : "1fr",
        marginBottom: 3,
        fontSize: 9,
      }}
    >
      <div>
        <div style={{ color: "#555", fontSize: 8 }}>{label}</div>
        <div style={{ fontWeight: 600 }}>{value || "—"}</div>
      </div>
      {secondLabel && (
        <div>
          <div style={{ color: "#555", fontSize: 8 }}>{secondLabel}</div>
          <div style={{ fontWeight: 600 }}>{secondValue || "—"}</div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: "3px 8px" }}>{label}</td>
      <td style={{ padding: "3px 8px", textAlign: "right" }}>{value}</td>
    </tr>
  );
}

// ─── Data builder ─────────────────────────────────────────────────────────────

async function buildInvoice(
  applicationId: string,
  billingMonth: string,
): Promise<InvoiceData> {
  const today = new Date().toLocaleDateString("en-ZA");

  // Fetch core data in parallel
  const [app, profile] = await Promise.all([
    getApplication(applicationId),
    getCurrentUser().catch(() => null),
  ]);

  const unit = app.unitId ? await getUnit(app.unitId).catch(() => null) : null;

  // Fetch banking details and charge configs for the company
  const companyId = profile?.companyId || app.companyId;
  const [bankingDetails, chargeConfigs] = await Promise.all([
    companyId ? getCompanyBankingDetails(companyId).catch(() => null) : null,
    companyId ? getCompanyChargeConfigs(companyId).catch(() => []) : [],
  ]);

  // Fetch additional charges for this billing month
  const { data: chargeRows } = await supabase
    .from("additional_charges")
    .select("*")
    .eq("application_id", applicationId)
    .eq("billing_month", billingMonth)
    .order("created_at", { ascending: true });

  // Fetch payments made by this tenant
  const { data: paymentRows } = await supabase
    .from("tenant_payments")
    .select("*")
    .eq("tenant_user_id", app.tenantUserId || "")
    .in("status", ["paid"])
    .order("created_at", { ascending: true });

  const charges = chargeRows || [];
  const payments = paymentRows || [];

  // Build line items
  const items: LineItem[] = [];

  // Opening balance row (sum of prior unpaid charges)
  const { data: priorRows } = await supabase
    .from("additional_charges")
    .select("amount, status")
    .eq("application_id", applicationId)
    .lt("billing_month", billingMonth)
    .in("status", ["pending", "overdue"]);

  const openingBalance = (priorRows || []).reduce(
    (s: number, r: any) => s + Number(r.amount || 0),
    0,
  );
  if (openingBalance !== 0) {
    items.push({
      date: "",
      allocation: "Balance B/f",
      remarks: "",
      exclusive: openingBalance,
      tax: 0,
      inclusive: openingBalance,
    });
  }

  // Payments received this month (show as credits)
  const monthStart = new Date(billingMonth + "-01");
  const monthEnd = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  );
  for (const p of payments) {
    const pDate = new Date(p.created_at);
    if (pDate >= monthStart && pDate <= monthEnd) {
      const amt = -Number(p.amount || 0);
      items.push({
        date: pDate.toLocaleDateString("en-ZA", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        allocation: "Receipt",
        remarks: p.reference || "",
        exclusive: amt,
        tax: 0,
        inclusive: amt,
      });
    }
  }

  // Rent line
  const rent = unit?.rent || 0;
  if (rent > 0) {
    const [year, month] = billingMonth.split("-");
    items.push({
      date: `01/${month}/${year}`,
      allocation: "Rent: Residential",
      remarks: `${unit?.name || "Unit"} - ${billingMonth}`,
      exclusive: rent,
      tax: 0,
      inclusive: rent,
    });
  }

  // Fixed recurring charges from company charge configs
  const fixedConfigs = (chargeConfigs as any[]).filter(
    (c: any) => c.isEnabled && c.isFixed,
  );
  const [year, month] = billingMonth.split("-");
  for (const cfg of fixedConfigs) {
    const amt = Number(cfg.amount || 0);
    if (amt > 0) {
      const tax = amt * (Number(cfg.taxRate || 0) / 100);
      items.push({
        date: `01/${month}/${year}`,
        allocation: cfg.name,
        remarks: cfg.description || "",
        exclusive: amt,
        tax,
        inclusive: amt + tax,
      });
    }
  }

  // Additional charges (manual, per-application)
  for (const c of charges) {
    const amt = Number(c.amount || 0);
    const d = new Date(c.created_at);
    const label = c.charge_type
      ? String(c.charge_type)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase())
      : "Additional Charge";
    items.push({
      date: d.toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      allocation: label,
      remarks: c.description || "",
      exclusive: amt,
      tax: 0,
      inclusive: amt,
    });
  }

  // Totals
  const fixedChargesTotal = fixedConfigs.reduce((s: number, c: any) => {
    const amt = Number(c.amount || 0);
    const tax = amt * (Number(c.taxRate || 0) / 100);
    return s + amt + tax;
  }, 0);
  const currentMonthCharges =
    rent +
    fixedChargesTotal +
    charges.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const totalPayments = payments
    .filter((p: any) => {
      const d = new Date(p.created_at);
      return d >= monthStart && d <= monthEnd;
    })
    .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const amountDue = openingBalance + currentMonthCharges - totalPayments;

  // Aging: simplified
  const aging: AgingBucket[] = [
    { label: "120 Days+", amount: 0 },
    { label: "90 Days", amount: 0 },
    { label: "60 Days", amount: 0 },
    { label: "30 Days", amount: openingBalance > 0 ? openingBalance : 0 },
    { label: "Current", amount: currentMonthCharges },
  ];

  return {
    entityName: profile?.companyName || "LeaseFlow Property Management",
    entityAddress: profile?.companyAddress,
    entityEmail: bankingDetails?.contactEmail,
    entityPhone: bankingDetails?.contactPhone,
    entityVatNo: bankingDetails?.vatNumber,
    entityRegNo: bankingDetails?.registrationNumber,
    // Banking details from database
    bankName: bankingDetails?.bankName,
    bankAccountHolder: bankingDetails?.accountHolder,
    bankAccountNo: bankingDetails?.accountNumber,
    bankBranchCode: bankingDetails?.branchCode,
    bankBranchName: bankingDetails?.branchName,
    paymentReference: `TEN-${app.id?.slice(0, 6).toUpperCase()}`,
    recipientName: app.fullName || "Tenant",
    recipientAddress: unit?.address,
    propertyName: unit?.estateName || unit?.name || "Property",
    unitNo: unit?.apartmentNumber || unit?.name || app.unitId || "",
    deposit: unit?.deposit || 0,
    bankGuarantee: 0,
    statementDate: today,
    invoiceNo: "",
    forMonth: billingMonth,
    items,
    aging,
    arrearsOrPrepaid: openingBalance,
    currentMonthCharges,
    amountDue,
  };
}

async function loadStoredInvoice(
  applicationId: string,
  billingMonth: string,
): Promise<StoredInvoiceDoc | null> {
  const { data, error } = await supabase
    .from("application_documents")
    .select("id, file_name, created_at")
    .eq("application_id", applicationId)
    .eq("document_type", `invoice_statement_pdf:${billingMonth}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    fileName: data.file_name,
    createdAt: data.created_at,
  };
}

async function generatePdfBlobFromElement(element: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgProps = pdf.getImageProperties(imgData);
  const imgWidth = pageWidth;
  const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

  let remainingHeight = imgHeight;
  let yOffset = 0;

  pdf.addImage(imgData, "PNG", 0, yOffset, imgWidth, imgHeight);
  remainingHeight -= pageHeight;

  while (remainingHeight > 0) {
    yOffset = remainingHeight - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, yOffset, imgWidth, imgHeight);
    remainingHeight -= pageHeight;
  }

  return pdf.output("blob");
}
