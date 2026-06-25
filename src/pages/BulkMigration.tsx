import { useState, useRef } from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
  Users,
  Building2,
  Info,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MigrationRow {
  rowNumber: number;
  // Tenant fields
  tenantName: string;
  tenantEmail: string;
  tenantCell?: string;
  tenantIdNumber?: string;
  // Unit fields
  unitName: string;
  unitAddress?: string;
  estateName?: string;
  rentAmount: number;
  depositAmount?: number;
  bedrooms?: number;
  bathrooms?: number;
  // Lease fields
  leaseStartDate?: string;
  leaseDurationMonths?: number;
  // Status
  status: "pending" | "success" | "error" | "skipped";
  message?: string;
}

interface MigrationResult {
  row: MigrationRow;
  unitId?: string;
  applicationId?: string;
  tenantUserId?: string;
}

// ─── Template columns ────────────────────────────────────────────────────────

const TEMPLATE_COLUMNS = [
  "Tenant Full Name",
  "Tenant Email",
  "Tenant Cell Number",
  "Tenant ID Number",
  "Unit Name",
  "Unit Address",
  "Estate Name",
  "Monthly Rent",
  "Deposit",
  "Bedrooms",
  "Bathrooms",
  "Lease Start Date (YYYY-MM-DD)",
  "Lease Duration Months",
];

const REQUIRED_COLUMNS = [
  "Tenant Full Name",
  "Tenant Email",
  "Unit Name",
  "Monthly Rent",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseExcelDate(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(value);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
  }
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return undefined;
}

function normalizeRow(
  raw: Record<string, any>,
  rowNumber: number,
): MigrationRow {
  return {
    rowNumber,
    tenantName: String(raw["Tenant Full Name"] || "").trim(),
    tenantEmail: String(raw["Tenant Email"] || "")
      .trim()
      .toLowerCase(),
    tenantCell: raw["Tenant Cell Number"]
      ? String(raw["Tenant Cell Number"]).trim()
      : undefined,
    tenantIdNumber: raw["Tenant ID Number"]
      ? String(raw["Tenant ID Number"]).trim()
      : undefined,
    unitName: String(raw["Unit Name"] || "").trim(),
    unitAddress: raw["Unit Address"]
      ? String(raw["Unit Address"]).trim()
      : undefined,
    estateName: raw["Estate Name"]
      ? String(raw["Estate Name"]).trim()
      : undefined,
    rentAmount:
      parseFloat(String(raw["Monthly Rent"] || "0").replace(/[^0-9.]/g, "")) ||
      0,
    depositAmount: raw["Deposit"]
      ? parseFloat(String(raw["Deposit"]).replace(/[^0-9.]/g, ""))
      : undefined,
    bedrooms: raw["Bedrooms"]
      ? parseInt(String(raw["Bedrooms"]), 10)
      : undefined,
    bathrooms: raw["Bathrooms"]
      ? parseFloat(String(raw["Bathrooms"]))
      : undefined,
    leaseStartDate: parseExcelDate(raw["Lease Start Date (YYYY-MM-DD)"]),
    leaseDurationMonths: raw["Lease Duration Months"]
      ? parseInt(String(raw["Lease Duration Months"]), 10)
      : 12,
    status: "pending",
  };
}

function validateRow(row: MigrationRow): string | null {
  if (!row.tenantName) return "Tenant Full Name is required";
  if (!row.tenantEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.tenantEmail))
    return "Valid Tenant Email is required";
  if (!row.unitName) return "Unit Name is required";
  if (!row.rentAmount || row.rentAmount <= 0)
    return "Monthly Rent must be greater than 0";
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BulkMigration() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<MigrationRow[]>([]);
  const [results, setResults] = useState<MigrationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    parseExcel(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileName(file.name);
    parseExcel(file);
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          defval: "",
        }) as Record<string, any>[];

        if (jsonData.length === 0) {
          toast.error("The spreadsheet appears to be empty");
          return;
        }

        // Check required columns
        const firstRow = jsonData[0];
        const missingCols = REQUIRED_COLUMNS.filter(
          (col) => !(col in firstRow),
        );
        if (missingCols.length > 0) {
          toast.error(`Missing required columns: ${missingCols.join(", ")}`);
          return;
        }

        const parsed = jsonData.map((raw, i) => normalizeRow(raw, i + 2));

        // Validate
        const errors: string[] = [];
        parsed.forEach((row) => {
          const err = validateRow(row);
          if (err) {
            row.status = "error";
            row.message = err;
            errors.push(`Row ${row.rowNumber}: ${err}`);
          }
        });

        setRows(parsed);
        setValidationErrors(errors);
        setStep("preview");
      } catch (err) {
        console.error(err);
        toast.error(
          "Failed to parse file. Ensure it is a valid Excel (.xlsx) or CSV file.",
        );
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLUMNS,
      [
        "Jane Doe",
        "jane.doe@email.com",
        "+27 81 123 4567",
        "9001015800080",
        "Unit 101",
        "123 Main Street, Johannesburg",
        "Sunridge Estate",
        "8500",
        "17000",
        "2",
        "1",
        "2026-07-01",
        "12",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tenants");
    XLSX.writeFile(wb, "leaseflow_migration_template.xlsx");
    toast.success("Template downloaded");
  };

  const runMigration = async () => {
    const validRows = rows.filter((r) => r.status !== "error");
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    let profile: any = null;
    try {
      profile = await getCurrentUser();
    } catch {
      toast.error("Could not get current user. Please sign in and try again.");
      setIsProcessing(false);
      return;
    }

    const companyId = profile?.companyId;
    if (!companyId) {
      toast.error("No company found for your account");
      setIsProcessing(false);
      return;
    }

    const migrationResults: MigrationResult[] = [];
    const updatedRows = [...rows];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const rowIndex = updatedRows.findIndex(
        (r) => r.rowNumber === row.rowNumber,
      );
      setProgress(Math.round(((i + 1) / validRows.length) * 100));

      try {
        // 1. Find or create unit
        let unitId: string | undefined;
        const { data: existingUnit } = await supabase
          .from("units")
          .select("id")
          .eq("company_id", companyId)
          .eq("name", row.unitName)
          .maybeSingle();

        if (existingUnit) {
          unitId = existingUnit.id;
        } else {
          // Find or create estate if provided
          let estateId: string | undefined;
          if (row.estateName) {
            const { data: existingEstate } = await supabase
              .from("estates")
              .select("id")
              .eq("company_id", companyId)
              .eq("name", row.estateName)
              .maybeSingle();

            if (existingEstate) {
              estateId = existingEstate.id;
            } else {
              const { data: newEstate, error: estateErr } = await supabase
                .from("estates")
                .insert({
                  company_id: companyId,
                  name: row.estateName,
                  status: "active",
                  total_units: 1,
                })
                .select("id")
                .single();
              if (estateErr) throw estateErr;
              estateId = newEstate.id;
            }
          }

          const { data: newUnit, error: unitErr } = await supabase
            .from("units")
            .insert({
              company_id: companyId,
              estate_id: estateId || null,
              estate_name: row.estateName || null,
              name: row.unitName,
              address: row.unitAddress || null,
              rent: row.rentAmount,
              deposit: row.depositAmount || 0,
              bedrooms: row.bedrooms || 0,
              bathrooms: row.bathrooms || 0,
              status: "occupied",
            })
            .select("id")
            .single();
          if (unitErr) throw unitErr;
          unitId = newUnit.id;
        }

        // 2. Create application record for the migrated tenant
        const appId = crypto.randomUUID();
        const { error: appErr } = await supabase.from("applications").insert({
          id: appId,
          full_name: row.tenantName,
          cell_number: row.tenantCell || "",
          id_number: row.tenantIdNumber || null,
          email: row.tenantEmail,
          unit_id: unitId,
          company_id: companyId,
          status: "lease_active",
          requires_credit_check: false,
          has_account: false,
          lease_start_date: row.leaseStartDate
            ? new Date(row.leaseStartDate).toISOString()
            : new Date().toISOString(),
          lease_duration_months: row.leaseDurationMonths || 12,
        });
        if (appErr) throw appErr;

        // 3. Send password reset email via Supabase Auth (invite tenant)
        // We use admin.generateLink or just send a recovery/invite email
        // Since we only have the client SDK, we use resetPasswordForEmail which triggers a magic link
        await supabase.auth.resetPasswordForEmail(row.tenantEmail, {
          redirectTo: `${window.location.origin}/signin?migrate=1`,
        });

        updatedRows[rowIndex] = {
          ...row,
          status: "success",
          message: "Imported successfully. Password setup email sent.",
        };
        migrationResults.push({
          row: updatedRows[rowIndex],
          unitId,
          applicationId: appId,
        });
      } catch (err: any) {
        updatedRows[rowIndex] = {
          ...row,
          status: "error",
          message: err?.message || "Import failed",
        };
        migrationResults.push({ row: updatedRows[rowIndex] });
      }
    }

    setRows(updatedRows);
    setResults(migrationResults);
    setIsProcessing(false);
    setStep("done");

    const successCount = migrationResults.filter(
      (r) => r.row.status === "success",
    ).length;
    const failCount = migrationResults.filter(
      (r) => r.row.status === "error",
    ).length;

    if (successCount > 0) {
      toast.success(
        `${successCount} tenant(s) imported successfully. Password setup emails sent.`,
      );
    }
    if (failCount > 0) {
      toast.error(`${failCount} row(s) failed. Review the results below.`);
    }
  };

  const reset = () => {
    setRows([]);
    setResults([]);
    setProgress(0);
    setFileName("");
    setStep("upload");
    setValidationErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validCount = rows.filter((r) => r.status !== "error").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">
              Bulk Migration
            </h1>
            <p className="text-muted-foreground mt-1">
              Import tenants, units, and leases from an Excel spreadsheet.
              Migrated tenants will receive an email to set their password.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </motion.div>

        {/* Upload Step */}
        {step === "upload" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Info card */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>How it works</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
                  <li>
                    Download the template and fill in tenant and unit details
                  </li>
                  <li>Upload your completed spreadsheet (.xlsx or .csv)</li>
                  <li>Review the preview and fix any errors</li>
                  <li>
                    Run the migration — units and applications will be created
                  </li>
                  <li>
                    Each migrated tenant receives a password setup email
                    automatically
                  </li>
                </ol>
              </AlertDescription>
            </Alert>

            {/* Upload zone */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Spreadsheet</CardTitle>
                <CardDescription>
                  Supported formats: Excel (.xlsx), CSV (.csv)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
                  <p className="font-semibold text-lg mb-1">
                    Drag & drop your file here
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to browse
                  </p>
                  <Button variant="outline" type="button">
                    <Upload className="h-4 w-4 mr-2" />
                    Browse Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Template info */}
            <Card>
              <CardHeader>
                <CardTitle>Required Columns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {TEMPLATE_COLUMNS.map((col) => (
                    <div
                      key={col}
                      className={`text-sm p-2 rounded border ${
                        REQUIRED_COLUMNS.includes(col)
                          ? "bg-accent/10 border-accent/30 font-medium"
                          : "bg-muted/50 border-border"
                      }`}
                    >
                      {REQUIRED_COLUMNS.includes(col) && (
                        <span className="text-destructive mr-1">*</span>
                      )}
                      {col}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <span className="text-destructive">*</span> Required fields
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Preview Step */}
        {step === "preview" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-accent" />
                    <div>
                      <p className="text-2xl font-bold">{rows.length}</p>
                      <p className="text-sm text-muted-foreground">
                        Total Rows
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                    <div>
                      <p className="text-2xl font-bold">{validCount}</p>
                      <p className="text-sm text-muted-foreground">Valid</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-destructive" />
                    <div>
                      <p className="text-2xl font-bold">{errorCount}</p>
                      <p className="text-sm text-muted-foreground">Errors</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{validCount}</p>
                      <p className="text-sm text-muted-foreground">To Import</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {validationErrors.length} validation error(s)
                </AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1 text-sm">
                    {validationErrors.slice(0, 5).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {validationErrors.length > 5 && (
                      <li>...and {validationErrors.length - 5} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Preview ({rows.length} rows from {fileName})
                </CardTitle>
                <CardDescription>
                  Review the data before importing. Rows with errors will be
                  skipped.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Estate</TableHead>
                        <TableHead className="text-right">Rent</TableHead>
                        <TableHead>Lease Start</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.rowNumber}>
                          <TableCell className="text-muted-foreground">
                            {row.rowNumber}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.tenantName || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.tenantEmail || "—"}
                          </TableCell>
                          <TableCell>{row.unitName || "—"}</TableCell>
                          <TableCell>{row.estateName || "—"}</TableCell>
                          <TableCell className="text-right">
                            {row.rentAmount > 0
                              ? `R${row.rentAmount.toLocaleString()}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.leaseStartDate || "—"}
                          </TableCell>
                          <TableCell>
                            {row.status === "error" ? (
                              <Badge
                                variant="destructive"
                                className="gap-1 text-xs"
                              >
                                <XCircle className="h-3 w-3" />
                                Error
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="gap-1 text-xs"
                              >
                                <CheckCircle2 className="h-3 w-3 text-success" />
                                Valid
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={reset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Over
              </Button>
              <Button
                variant="accent"
                onClick={runMigration}
                disabled={validCount === 0 || isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Import {validCount} Tenant{validCount !== 1 ? "s" : ""}
              </Button>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </motion.div>
        )}

        {/* Done Step */}
        {step === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                    <div>
                      <p className="text-2xl font-bold text-success">
                        {
                          results.filter((r) => r.row.status === "success")
                            .length
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">Imported</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-destructive" />
                    <div>
                      <p className="text-2xl font-bold text-destructive">
                        {results.filter((r) => r.row.status === "error").length}
                      </p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {
                          results.filter((r) => r.row.status === "success")
                            .length
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Emails Sent
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert className="border-success/30 bg-success/5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertTitle>Migration Complete</AlertTitle>
              <AlertDescription>
                All successfully migrated tenants have been sent a password
                setup email. They will be prompted to create their password upon
                clicking the link.
              </AlertDescription>
            </Alert>

            {/* Results table */}
            <Card>
              <CardHeader>
                <CardTitle>Migration Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.rowNumber}>
                          <TableCell className="text-muted-foreground">
                            {row.rowNumber}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.tenantName}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.tenantEmail}
                          </TableCell>
                          <TableCell>{row.unitName}</TableCell>
                          <TableCell>
                            {row.status === "success" ? (
                              <Badge
                                variant="success"
                                className="gap-1 text-xs"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Success
                              </Badge>
                            ) : row.status === "error" ? (
                              <Badge
                                variant="destructive"
                                className="gap-1 text-xs"
                              >
                                <XCircle className="h-3 w-3" />
                                Failed
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="gap-1 text-xs"
                              >
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                            {row.message || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button variant="outline" onClick={reset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                New Migration
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
