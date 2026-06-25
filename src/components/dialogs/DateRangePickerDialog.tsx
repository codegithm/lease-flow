import { useState } from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";

interface DateRangePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: (startDate: Date, endDate: Date) => void;
}

const presets = [
  { label: "Last 7 days", getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Last 90 days", getValue: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: "This month", getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last month", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
];

export function DateRangePickerDialog({ open, onOpenChange, onApply }: DateRangePickerDialogProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const handlePresetClick = (preset: typeof presets[0]) => {
    const { from, to } = preset.getValue();
    setDateRange({ from, to });
  };

  const handleApply = () => {
    if (dateRange.from && dateRange.to) {
      onApply?.(dateRange.from, dateRange.to);
      toast.success(`Date range set: ${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`);
      onOpenChange(false);
    } else {
      toast.error("Please select both start and end dates");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-accent" />
            Select Date Range
          </DialogTitle>
          <DialogDescription>
            Choose a preset or select custom dates for your report.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-[150px_1fr] gap-4 py-4">
          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Select</Label>
            <div className="flex flex-col gap-1">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start h-8 text-sm"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="flex justify-center">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              numberOfMonths={1}
              disabled={(date) => date > new Date()}
              className="pointer-events-auto"
            />
          </div>
        </div>

        {/* Selected Range Display */}
        {dateRange.from && dateRange.to && (
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-sm text-muted-foreground">Selected range:</p>
            <p className="font-medium">
              {format(dateRange.from, "MMMM d, yyyy")} — {format(dateRange.to, "MMMM d, yyyy")}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleApply}>
            Apply Range
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
