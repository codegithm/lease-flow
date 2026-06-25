import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Shield,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Scale,
  Building2,
} from "lucide-react";

export default function TermsAndConditions() {
  const lastUpdated = "January 14, 2026";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <FileText className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">
              Terms & Conditions
            </h1>
            <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
          </div>
        </div>

        {/* Platform Fee Section */}
        <Card className="border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-accent" />
              Platform Fees & Payment Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-accent/5 p-4 rounded-lg border border-accent/20">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="accent">0.005%</Badge>
                Platform Service Fee
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                LeaseFlow charges a minimal platform fee of{" "}
                <strong>0.005%</strong> on payments processed through our
                system. This fee helps us maintain and improve our services.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Initial Payments</p>
                    <p className="text-sm text-muted-foreground">
                      For initial move-in payments (rent + deposit + other
                      charges), the platform fee is calculated only on the{" "}
                      <strong>rent portion</strong>. For example, if your rent
                      is R6,000 and the total initial payment is R13,000, the
                      platform fee is only R0.30 (0.005% of R6,000).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Regular & Additional Payments</p>
                    <p className="text-sm text-muted-foreground">
                      For monthly rent payments, fines, additional charges, and
                      other fees, the platform fee is calculated on the{" "}
                      <strong>full payment amount</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Payment Processor Fees
                </h4>
                <p className="text-sm text-muted-foreground">
                  Additional fees from payment processors (Stripe, PayFast,
                  Ozow, etc.) may apply based on their standard rates. These
                  fees are separate from the LeaseFlow platform fee.
                </p>
              </div>

              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Fee Transparency
                </h4>
                <p className="text-sm text-muted-foreground">
                  All applicable fees will be clearly displayed before you
                  confirm any payment. You'll always know the exact breakdown of
                  your payment.
                </p>
              </div>
            </div>

            {/* Example Calculation */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Example Fee Calculation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Rent:</span>
                  <span className="font-medium">R6,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Platform Fee (0.005%):
                  </span>
                  <span className="font-medium">R0.30</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold">R6,000.30</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Charges Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Additional Charges & Fines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Landlords, property managers, and agents may add additional
              charges to your monthly statement for various reasons including
              but not limited to:
            </p>

            <ul className="space-y-2 ml-4">
              {[
                "Maintenance or repair costs caused by tenant negligence",
                "Utility overages beyond agreed limits",
                "Late payment penalties",
                "Violation fines (noise complaints, unauthorized pets, etc.)",
                "Damage assessment charges",
                "Administrative fees",
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
              <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Scale className="h-4 w-4" />
                Your Right to Appeal
              </h4>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                If you believe a charge has been applied unfairly, you have the
                right to appeal. You can submit supporting documentation with
                your appeal. However, please note that the landlord or property
                manager has the <strong>final decision</strong> on all charge
                disputes.
              </p>
            </div>

            <div className="p-4 rounded-lg border">
              <h4 className="font-medium mb-2">Charge Documentation</h4>
              <p className="text-sm text-muted-foreground">
                Property managers may attach supporting documents (photos,
                invoices, inspection reports) to justify charges. You will have
                access to view these documents in your tenant portal.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tenant Responsibilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />
              Tenant Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              As a tenant using our platform, you agree to:
            </p>

            <ul className="space-y-3">
              {[
                {
                  title: "Timely Payments",
                  description:
                    "Pay rent and all approved charges by their due dates to avoid late fees.",
                },
                {
                  title: "Accurate Information",
                  description:
                    "Provide accurate personal and financial information during the application process.",
                },
                {
                  title: "Property Care",
                  description:
                    "Maintain the rental property in good condition and report any issues promptly.",
                },
                {
                  title: "Communication",
                  description:
                    "Respond to landlord communications in a timely manner through the platform.",
                },
                {
                  title: "Dispute Resolution",
                  description:
                    "Use the official appeal process for any charge disputes before seeking external resolution.",
                },
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              Privacy & Data Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We take your privacy seriously. Your personal and financial
              information is:
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-2">Encrypted</h4>
                <p className="text-sm text-muted-foreground">
                  All sensitive data is encrypted in transit and at rest using
                  industry-standard encryption protocols.
                </p>
              </div>
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-2">Protected</h4>
                <p className="text-sm text-muted-foreground">
                  Access to your data is strictly controlled and only shared
                  with your landlord and authorized service providers.
                </p>
              </div>
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-2">Compliant</h4>
                <p className="text-sm text-muted-foreground">
                  We comply with POPIA (Protection of Personal Information Act)
                  and other applicable data protection regulations.
                </p>
              </div>
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-2">Your Control</h4>
                <p className="text-sm text-muted-foreground">
                  You can request a copy of your data or request deletion at any
                  time by contacting our support team.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground text-center">
              If you have any questions about these terms, please contact us at{" "}
              <a
                href="mailto:support@leaseflow.co.za"
                className="text-accent hover:underline"
              >
                support@leaseflow.co.za
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
