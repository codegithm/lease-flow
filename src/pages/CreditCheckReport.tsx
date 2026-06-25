import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  User,
  Briefcase,
  MapPin,
  Phone,
  AlertTriangle,
  BarChart3,
  CreditCard,
  Search,
  Bell,
  FileText,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhoneNumber {
  areaCode?: string;
  number?: string;
  date?: string;
  years?: string;
}

interface Address {
  consumerNo?: string;
  informationDate?: string;
  line1?: string;
  line2?: string;
  suburb?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  addressPeriod?: string;
  ownerTenant?: string;
}

interface Employment {
  informationDate?: string;
  occupation?: string;
  employerName?: string;
  employmentPeriod?: string;
}

interface ConsumerInfo {
  surname?: string;
  forename1?: string;
  title?: string;
  gender?: string;
  dateOfBirth?: string;
  identityNo1?: string;
  maritalStatusDesc?: string;
  dependants?: string;
  cellNumber?: string;
  email?: string;
  telephoneNumbers?: string;
  deceasedDate?: string;
}

interface EvolutionCounters {
  activeAccounts?: string;
  closedAccounts?: string;
  adverseAccounts?: string;
  currBalance?: string;
  currMonthlyInstallment?: string;
  currHigestMia?: string;
  mnthsInArrears?: string;
  cummulativeArrearsAmount?: string;
  currJdgmnt?: string;
  currDefault?: string;
  currNotices?: string;
  currOwnEnq?: string;
  currOtherEnq?: string;
}

interface PaymentHistoryEntry {
  paymentHistoryDate?: string;
  statusCode?: string;
  lastPayDate?: string;
}

interface PaymentProfile {
  supplierName?: string;
  accountTypeCode?: string;
  accountType?: string;
  accountNumber?: string;
  dateOpened?: string;
  openingBalance?: string;
  currentBalance?: string;
  instalment?: string;
  overdueAmount?: string;
  terms?: string;
  industryCode?: string;
  industry?: string;
  paymentType?: string;
  loanReasonCodeDescription?: string;
  lastUpdateDate?: string;
  evolutionPaymentHistory?: {
    evolutionPaymentHistory?: PaymentHistoryEntry[];
  };
}

interface Enquiry {
  dateOfEnquiry?: string;
  enqSubscriberName?: string;
  enqTypeDesc?: string;
  industryDesc?: string;
  ownAccount?: string;
}

interface TraceAlert {
  informationDate?: string;
  traceTypeDesc?: string;
  contactName?: string;
  contactPhone?: string;
  subscriberName?: string;
  comment1?: string;
}

interface TransUnionReport {
  ResponseData?: {
    ResponseData?: {
      transactionDetail?: {
        transactionId?: string;
        timestamp?: string;
        products?: { code?: string; description?: string }[];
      };
      consumer?: {
        consumerHeader?: {
          consumerInfo?: ConsumerInfo;
          employment?: Employment[];
        };
        consumerContact?: {
          consumerTelephoneHistory?: {
            workNumbers?: { phoneNumber?: PhoneNumber[] };
            homeNumbers?: { phoneNumber?: PhoneNumber[] };
            cellNumbers?: { phoneNumber?: PhoneNumber[] };
          };
          address?: {
            address?: Address[];
          };
        };
        adverse?: {
          debtCounselling?: {
            debtCounsellingDate?: string;
            debtCounsellingDescription?: string;
          };
          judgements?: unknown;
          defaultsPart1?: unknown;
          notices?: unknown;
        };
        summary?: {
          evolutionCounters?: {
            evolutionCounters?: EvolutionCounters;
          };
        };
        ppAndEnquiries?: {
          evolutionPaymentProfile?: {
            evolutionPaymentProfile?: PaymentProfile[];
          };
          evolutionEnquiries?: {
            evolutionEnquiries?: Enquiry[];
          };
        };
        alerts?: {
          traceAlerts?: {
            traceAlerts?: TraceAlert[];
          };
        };
        scoring?: Record<string, unknown>;
      };
      errors?: unknown;
    };
  };
}

// ─── Helper components ───────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm py-1 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4 text-accent" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  "0": {
    label: "Current",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  "1": {
    label: "1 Month",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  "2": {
    label: "2 Months",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  },
  "3": {
    label: "3 Months",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

function StatusBadge({ code }: { code?: string }) {
  const cfg = code ? PAYMENT_STATUS[code] : undefined;
  if (!cfg)
    return <span className="text-xs text-muted-foreground">{code ?? "—"}</span>;
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CreditCheckReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<TransUnionReport | null>(null);
  const [applicantName, setApplicantName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error: dbError } = await supabase
        .from("applications")
        .select("full_name, credit_report_data")
        .eq("id", id)
        .single();

      if (dbError || !data) {
        setError(dbError?.message ?? "Application not found.");
      } else if (!data.credit_report_data) {
        setError("No credit report data found. Run a credit check first.");
      } else {
        setReport(data.credit_report_data as TransUnionReport);
        setApplicantName(data.full_name ?? "");
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Report Unavailable</h2>
          <p className="text-muted-foreground max-w-sm">{error}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const responseData = report?.ResponseData?.ResponseData;
  const txDetail = responseData?.transactionDetail;
  const consumer = responseData?.consumer;
  const consumerInfo = consumer?.consumerHeader?.consumerInfo;
  const employment = consumer?.consumerHeader?.employment ?? [];
  const contact = consumer?.consumerContact;
  const addresses = contact?.address?.address ?? [];
  const teleHistory = contact?.consumerTelephoneHistory;
  const adverse = consumer?.adverse;
  const counters = consumer?.summary?.evolutionCounters?.evolutionCounters;
  const paymentProfiles =
    consumer?.ppAndEnquiries?.evolutionPaymentProfile
      ?.evolutionPaymentProfile ?? [];
  const enquiries =
    consumer?.ppAndEnquiries?.evolutionEnquiries?.evolutionEnquiries ?? [];
  const traceAlerts = consumer?.alerts?.traceAlerts?.traceAlerts ?? [];
  const debtCounselling = adverse?.debtCounselling;

  const hasAdverse =
    debtCounselling?.debtCounsellingDescription ||
    adverse?.judgements ||
    adverse?.defaultsPart1 ||
    adverse?.notices;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">Credit Report</h1>
            {applicantName && (
              <p className="text-muted-foreground">{applicantName}</p>
            )}
          </div>
          {txDetail?.transactionId && (
            <Badge variant="secondary" className="ml-auto text-xs">
              Ref: {txDetail.transactionId}
            </Badge>
          )}
        </div>

        {/* Transaction Meta */}
        {txDetail && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {txDetail.timestamp && (
              <span>
                Report generated:{" "}
                {new Date(txDetail.timestamp).toLocaleString()}
              </span>
            )}
            {txDetail.products?.map((p) => (
              <Badge key={p.code} variant="outline" className="text-xs">
                {p.description ?? p.code}
              </Badge>
            ))}
          </div>
        )}

        {/* ── Adverse Alert Banner ─────────────────────────────── */}
        {hasAdverse && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive"
          >
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">
                Adverse Information Detected
              </p>
              <p className="text-xs mt-0.5">
                This consumer has adverse records. Review the adverse section
                carefully before proceeding.
              </p>
            </div>
          </motion.div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* ── Consumer Info ──────────────────────────────────── */}
          <SectionCard icon={User} title="Consumer Information" delay={0.05}>
            <InfoRow
              label="Full Name"
              value={[
                consumerInfo?.title,
                consumerInfo?.forename1,
                consumerInfo?.surname,
              ]
                .filter(Boolean)
                .join(" ")}
            />
            <InfoRow
              label="Identity Number"
              value={consumerInfo?.identityNo1}
            />
            <InfoRow label="Date of Birth" value={consumerInfo?.dateOfBirth} />
            <InfoRow label="Gender" value={consumerInfo?.gender} />
            <InfoRow
              label="Marital Status"
              value={consumerInfo?.maritalStatusDesc}
            />
            <InfoRow label="Dependants" value={consumerInfo?.dependants} />
            <InfoRow label="Cell Number" value={consumerInfo?.cellNumber} />
            <InfoRow label="Email" value={consumerInfo?.email} />
            {consumerInfo?.deceasedDate && (
              <div className="mt-2">
                <Badge variant="destructive">
                  Deceased: {consumerInfo.deceasedDate}
                </Badge>
              </div>
            )}
          </SectionCard>

          {/* ── Employment ────────────────────────────────────── */}
          <SectionCard icon={Briefcase} title="Employment History" delay={0.1}>
            {employment.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No employment records on file.
              </p>
            ) : (
              <div className="space-y-4">
                {employment.map((emp, i) => (
                  <div key={i} className="space-y-1">
                    {i > 0 && <Separator className="mb-3" />}
                    <InfoRow label="Employer" value={emp.employerName} />
                    <InfoRow label="Occupation" value={emp.occupation} />
                    <InfoRow label="Period" value={emp.employmentPeriod} />
                    <InfoRow label="Date" value={emp.informationDate} />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Summary Counters ──────────────────────────────── */}
          <SectionCard icon={BarChart3} title="Credit Summary" delay={0.15}>
            {counters ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Active Accounts", value: counters.activeAccounts },
                  { label: "Closed Accounts", value: counters.closedAccounts },
                  {
                    label: "Adverse Accounts",
                    value: counters.adverseAccounts,
                  },
                  {
                    label: "Months in Arrears",
                    value: counters.mnthsInArrears,
                  },
                  {
                    label: "Current Balance",
                    value: counters.currBalance
                      ? `R ${Number(counters.currBalance).toLocaleString()}`
                      : undefined,
                  },
                  {
                    label: "Monthly Instalment",
                    value: counters.currMonthlyInstallment
                      ? `R ${Number(counters.currMonthlyInstallment).toLocaleString()}`
                      : undefined,
                  },
                  {
                    label: "Arrears Amount",
                    value: counters.cummulativeArrearsAmount
                      ? `R ${Number(counters.cummulativeArrearsAmount).toLocaleString()}`
                      : undefined,
                  },
                  {
                    label: "Highest MIA (curr)",
                    value: counters.currHigestMia,
                  },
                  { label: "Judgements (curr)", value: counters.currJdgmnt },
                  { label: "Defaults (curr)", value: counters.currDefault },
                  { label: "Notices (curr)", value: counters.currNotices },
                  { label: "Own Enquiries", value: counters.currOwnEnq },
                  { label: "Other Enquiries", value: counters.currOtherEnq },
                ].map(({ label, value }) =>
                  value != null ? (
                    <div
                      key={label}
                      className="bg-muted/50 rounded-lg p-3 text-center"
                    >
                      <div className="text-lg font-bold">{value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {label}
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No summary data available.
              </p>
            )}
          </SectionCard>

          {/* ── Adverse ───────────────────────────────────────── */}
          <SectionCard
            icon={AlertTriangle}
            title="Adverse Information"
            delay={0.2}
          >
            {!hasAdverse ? (
              <p className="text-sm text-success font-medium">
                No adverse information found.
              </p>
            ) : (
              <div className="space-y-3">
                {debtCounselling?.debtCounsellingDescription && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs font-semibold text-destructive mb-1">
                      Debt Counselling
                    </p>
                    <p className="text-sm">
                      {debtCounselling.debtCounsellingDescription}
                    </p>
                    {debtCounselling.debtCounsellingDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Date: {debtCounselling.debtCounsellingDate}
                      </p>
                    )}
                  </div>
                )}
                {adverse?.judgements && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs font-semibold text-destructive">
                      Judgements on Record
                    </p>
                  </div>
                )}
                {adverse?.defaultsPart1 && (
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="text-xs font-semibold text-warning">
                      Defaults on Record
                    </p>
                  </div>
                )}
                {adverse?.notices && (
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="text-xs font-semibold text-warning">
                      Notices on Record
                    </p>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* ── Addresses ─────────────────────────────────────── */}
          <SectionCard icon={MapPin} title="Address History" delay={0.25}>
            {addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No address history on file.
              </p>
            ) : (
              <div className="space-y-4">
                {addresses.map((addr, i) => (
                  <div key={i}>
                    {i > 0 && <Separator className="mb-3" />}
                    <p className="text-sm font-medium">
                      {[addr.line1, addr.line2, addr.suburb, addr.city]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <div className="mt-1 space-y-0.5">
                      <InfoRow label="Province" value={addr.province} />
                      <InfoRow label="Postal Code" value={addr.postalCode} />
                      <InfoRow label="Period" value={addr.addressPeriod} />
                      <InfoRow label="Date" value={addr.informationDate} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Telephone History ─────────────────────────────── */}
          <SectionCard icon={Phone} title="Contact Numbers" delay={0.3}>
            {(() => {
              const cells = teleHistory?.cellNumbers?.phoneNumber ?? [];
              const work = teleHistory?.workNumbers?.phoneNumber ?? [];
              const home = teleHistory?.homeNumbers?.phoneNumber ?? [];
              const total = cells.length + work.length + home.length;
              if (total === 0)
                return (
                  <p className="text-sm text-muted-foreground">
                    No telephone history on file.
                  </p>
                );
              return (
                <div className="space-y-3">
                  {cells.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Cell
                      </p>
                      {cells.map((p, i) => (
                        <p key={i} className="text-sm">
                          {p.number}
                          {p.date ? ` (${p.date})` : ""}
                        </p>
                      ))}
                    </div>
                  )}
                  {work.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Work
                      </p>
                      {work.map((p, i) => (
                        <p key={i} className="text-sm">
                          {p.areaCode}
                          {p.number}
                          {p.date ? ` (${p.date})` : ""}
                        </p>
                      ))}
                    </div>
                  )}
                  {home.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Home
                      </p>
                      {home.map((p, i) => (
                        <p key={i} className="text-sm">
                          {p.areaCode}
                          {p.number}
                          {p.date ? ` (${p.date})` : ""}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </SectionCard>
        </div>

        {/* ── Payment Profiles ────────────────────────────────── */}
        {paymentProfiles.length > 0 && (
          <SectionCard
            icon={CreditCard}
            title={`Payment Profiles (${paymentProfiles.length})`}
            delay={0.35}
          >
            <div className="space-y-6">
              {paymentProfiles.map((p, i) => (
                <div key={i}>
                  {i > 0 && <Separator className="my-4" />}
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-medium">{p.supplierName}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.accountType} · {p.industry}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {p.accountNumber}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {[
                      { label: "Opened", value: p.dateOpened },
                      {
                        label: "Opening Bal",
                        value: p.openingBalance
                          ? `R ${Number(p.openingBalance).toLocaleString()}`
                          : undefined,
                      },
                      {
                        label: "Current Bal",
                        value: p.currentBalance
                          ? `R ${Number(p.currentBalance).toLocaleString()}`
                          : undefined,
                      },
                      {
                        label: "Instalment",
                        value: p.instalment
                          ? `R ${Number(p.instalment).toLocaleString()}`
                          : undefined,
                      },
                      {
                        label: "Overdue",
                        value: p.overdueAmount
                          ? `R ${Number(p.overdueAmount).toLocaleString()}`
                          : undefined,
                      },
                      { label: "Terms", value: p.terms },
                      { label: "Last Updated", value: p.lastUpdateDate },
                      {
                        label: "Loan Reason",
                        value: p.loanReasonCodeDescription,
                      },
                    ].map(({ label, value }) =>
                      value ? (
                        <div
                          key={label}
                          className="bg-muted/40 rounded p-2 text-center"
                        >
                          <div className="text-sm font-semibold">{value}</div>
                          <div className="text-xs text-muted-foreground">
                            {label}
                          </div>
                        </div>
                      ) : null,
                    )}
                  </div>
                  {/* Payment history strip */}
                  {p.evolutionPaymentHistory?.evolutionPaymentHistory && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Payment History (newest first)
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {p.evolutionPaymentHistory.evolutionPaymentHistory
                          .slice(0, 24)
                          .map((h, hi) => (
                            <div
                              key={hi}
                              className="flex flex-col items-center gap-0.5"
                            >
                              <StatusBadge code={h.statusCode} />
                              <span className="text-[10px] text-muted-foreground">
                                {h.paymentHistoryDate?.slice(0, 7)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Enquiries ───────────────────────────────────────── */}
        {enquiries.length > 0 && (
          <SectionCard
            icon={Search}
            title={`Credit Enquiries (${enquiries.length})`}
            delay={0.4}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Subscriber
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Industry
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Own
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enquiries.map((enq, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="py-2 text-muted-foreground">
                        {enq.dateOfEnquiry}
                      </td>
                      <td className="py-2">{enq.enqSubscriberName}</td>
                      <td className="py-2 text-muted-foreground">
                        {enq.enqTypeDesc}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {enq.industryDesc}
                      </td>
                      <td className="py-2">
                        {enq.ownAccount === "Y" ? (
                          <Badge variant="secondary" className="text-xs">
                            Own
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* ── Trace Alerts ────────────────────────────────────── */}
        {traceAlerts.length > 0 && (
          <SectionCard
            icon={Bell}
            title={`Trace Alerts (${traceAlerts.length})`}
            delay={0.45}
          >
            <div className="space-y-3">
              {traceAlerts.map((ta, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-warning/10 border border-warning/20"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium">{ta.traceTypeDesc}</p>
                    <span className="text-xs text-muted-foreground">
                      {ta.informationDate}
                    </span>
                  </div>
                  {ta.subscriberName && (
                    <p className="text-xs text-muted-foreground">
                      By: {ta.subscriberName}
                    </p>
                  )}
                  {ta.contactName && (
                    <p className="text-xs">
                      Contact: {ta.contactName}{" "}
                      {ta.contactPhone ? `· ${ta.contactPhone}` : ""}
                    </p>
                  )}
                  {ta.comment1 && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      {ta.comment1}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Scoring raw ─────────────────────────────────── */}
        {consumer?.scoring && (
          <SectionCard icon={TrendingUp} title="Scoring Data" delay={0.5}>
            <pre className="text-xs text-muted-foreground bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(consumer.scoring, null, 2)}
            </pre>
          </SectionCard>
        )}

        {/* ── Errors ──────────────────────────────────────── */}
        {responseData?.errors && (
          <SectionCard icon={FileText} title="API Errors" delay={0.55}>
            <pre className="text-xs text-destructive bg-destructive/5 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(responseData.errors, null, 2)}
            </pre>
          </SectionCard>
        )}

        <div className="pb-8" />
      </div>
    </DashboardLayout>
  );
}
