import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

interface IssueFineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
  onSubmit: (amount: number, reason: string) => void;
}

export function IssueFineDialog({
  open,
  onOpenChange,
  tenantName,
  onSubmit,
}: IssueFineDialogProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !reason) {
      toast.error("Please fill in all fields");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onSubmit(amountNum, reason);
    toast.success(`Fine of R${amountNum.toLocaleString()} issued to ${tenantName}`);
    
    setAmount("");
    setReason("");
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Issue Fine
          </DialogTitle>
          <DialogDescription>
            Issue a fine to <span className="font-medium">{tenantName}</span>. This will be added to their next payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Fine Amount (R)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="250"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Fine</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Late payment, noise complaint, property damage..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Issuing...
              </>
            ) : (
              "Issue Fine"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
