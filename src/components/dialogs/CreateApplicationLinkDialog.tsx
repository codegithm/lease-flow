import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Copy,
  Send,
  Link2,
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { createApplicationLink, getUnits } from "@/lib/api";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface CreateApplicationLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedUnitId?: string;
}

export function CreateApplicationLinkDialog({
  open,
  onOpenChange,
  preselectedUnitId,
}: CreateApplicationLinkDialogProps) {
  const [fullName, setFullName] = useState("");
  const [cellNumber, setCellNumber] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [unitId, setUnitId] = useState(preselectedUnitId || "");
  const [requiresCreditCheck, setRequiresCreditCheck] = useState(true);
  const [generatedLink, setGeneratedLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [units, setUnits] = useState<any[]>([]);

  // Lease terms
  const [leaseStartDate, setLeaseStartDate] = useState<Date | undefined>(
    undefined
  );
  const [leaseDurationMonths, setLeaseDurationMonths] = useState("12");

  useEffect(() => {
    (async () => {
      try {
        const resp = await getUnits();
        if (Array.isArray(resp)) setUnits(resp);
        else setUnits([]);
      } catch (err) {
        console.error("Failed to load units for link dialog", err);
        setUnits([]);
      }
    })();
  }, []);

  const handleGenerateLink = async () => {
    if (!fullName || !cellNumber || !unitId) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!leaseStartDate) {
      toast.error("Please select a lease start date");
      return;
    }

    setIsSubmitting(true);
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      const resp = await createApplicationLink({
        fullName,
        cellNumber,
        idNumber,
        requiresCreditCheck,
        unitId,
        agentId: user?.id,
        leaseStartDate: leaseStartDate.toISOString(),
        leaseDurationMonths: parseInt(leaseDurationMonths),
      });

      // if backend returned a LinkUrl use it; otherwise construct from id
      const link =
        resp.linkUrl || `${window.location.origin}/apply?register=${resp.id}`;
      setGeneratedLink(link);
      toast.success("Application link generated!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to generate link");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success("Link copied to clipboard!");
  };

  const handleSendWhatsApp = () => {
    const message = encodeURIComponent(
      `Hi ${fullName}, please complete your application here: ${generatedLink}`
    );
    window.open(
      `https://wa.me/${cellNumber.replace(/\D/g, "")}?text=${message}`,
      "_blank"
    );
  };

  const handleReset = () => {
    setFullName("");
    setCellNumber("");
    setIdNumber("");
    setUnitId(preselectedUnitId || "");
    setRequiresCreditCheck(true);
    setGeneratedLink("");
    setLeaseStartDate(undefined);
    setLeaseDurationMonths("12");
  };

  const leaseEndDate = leaseStartDate
    ? addMonths(leaseStartDate, parseInt(leaseDurationMonths))
    : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) handleReset();
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Link2 className="h-5 w-5 text-accent" />
            Create Application Link
          </DialogTitle>
          <DialogDescription>
            Generate a personalized application link for a prospective tenant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="unit">Property Unit *</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a unit" />
              </SelectTrigger>
              <SelectContent>
                {units.length > 0 ? (
                  units.map((unit) => (
                    <SelectItem key={unit.id} value={String(unit.id)}>
                      {unit.name} - {String(unit.address || "").split(",")[0]}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="">No units available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cellNumber">Cell Number *</Label>
            <Input
              id="cellNumber"
              type="tel"
              placeholder="+27 82 123 4567"
              value={cellNumber}
              onChange={(e) => setCellNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="idNumber">ID Number</Label>
            <Input
              id="idNumber"
              placeholder="9001015800083"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
            />
          </div>

          {/* Lease Terms Section */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
            <Label className="text-sm font-medium">Lease Terms</Label>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="leaseStartDate"
                  className="text-xs text-muted-foreground"
                >
                  Start Date *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !leaseStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {leaseStartDate
                        ? format(leaseStartDate, "PPP")
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={leaseStartDate}
                      onSelect={setLeaseStartDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="leaseDuration"
                  className="text-xs text-muted-foreground"
                >
                  Duration
                </Label>
                <Select
                  value={leaseDurationMonths}
                  onValueChange={setLeaseDurationMonths}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months (1 year)</SelectItem>
                    <SelectItem value="24">24 months (2 years)</SelectItem>
                    <SelectItem value="36">36 months (3 years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {leaseStartDate && leaseEndDate && (
              <p className="text-xs text-muted-foreground">
                Lease period: {format(leaseStartDate, "d MMM yyyy")} to{" "}
                {format(leaseEndDate, "d MMM yyyy")}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="creditCheck"
              checked={requiresCreditCheck}
              onCheckedChange={(checked) =>
                setRequiresCreditCheck(checked as boolean)
              }
            />
            <Label
              htmlFor="creditCheck"
              className="text-sm font-normal cursor-pointer"
            >
              Require credit check for this applicant
            </Label>
          </div>

          {generatedLink && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <Label>Generated Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={generatedLink}
                  className="text-xs bg-background"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Send this link to the client via WhatsApp or copy it.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {!generatedLink ? (
            <Button
              variant="accent"
              onClick={handleGenerateLink}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {isSubmitting ? "Generating..." : "Generate Link"}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="accent" onClick={handleSendWhatsApp}>
                <Send className="h-4 w-4 mr-2" />
                Send via WhatsApp
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
