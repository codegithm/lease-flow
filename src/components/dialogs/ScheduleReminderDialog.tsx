import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import {
  Bell,
  Calendar as CalendarIcon,
  Clock,
  Mail,
  MessageCircle,
  Loader2,
  Repeat,
} from "lucide-react";

interface ScheduleReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  defaultType?: 'payment' | 'lease_renewal' | 'inspection' | 'custom';
}

const reminderTypes = [
  { value: 'payment', label: 'Payment Reminder', icon: '💰' },
  { value: 'lease_renewal', label: 'Lease Renewal', icon: '📄' },
  { value: 'inspection', label: 'Property Inspection', icon: '🏠' },
  { value: 'maintenance', label: 'Scheduled Maintenance', icon: '🔧' },
  { value: 'custom', label: 'Custom Reminder', icon: '📝' },
];

const defaultMessages: Record<string, string> = {
  payment: "This is a friendly reminder that your rent payment is due soon. Please ensure timely payment to avoid late fees.",
  lease_renewal: "Your lease agreement is approaching its renewal date. Please contact us to discuss renewal options.",
  inspection: "A property inspection has been scheduled. Please ensure the property is accessible at the scheduled time.",
  maintenance: "Scheduled maintenance will be performed at your property. Please ensure access as required.",
  custom: "",
};

export function ScheduleReminderDialog({
  open,
  onOpenChange,
  tenantName,
  tenantEmail,
  tenantPhone,
  defaultType = 'payment',
}: ScheduleReminderDialogProps) {
  const [reminderType, setReminderType] = useState(defaultType);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [message, setMessage] = useState(defaultMessages[defaultType]);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState("monthly");
  const [isScheduling, setIsScheduling] = useState(false);

  const handleTypeChange = (type: string) => {
    setReminderType(type as typeof reminderType);
    setMessage(defaultMessages[type] || "");
  };

  const handleSchedule = async () => {
    if (!scheduledDate) {
      toast.error("Please select a date");
      return;
    }

    setIsScheduling(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const channels = [];
    if (sendEmail) channels.push("Email");
    if (sendSMS) channels.push("SMS");
    if (sendWhatsApp) channels.push("WhatsApp");

    toast.success(
      <div className="space-y-1">
        <p className="font-medium">Reminder scheduled!</p>
        <p className="text-sm text-muted-foreground">
          {format(scheduledDate, "d MMMM yyyy")} at {scheduledTime}
        </p>
        <p className="text-xs text-muted-foreground">
          Via: {channels.join(", ")}
        </p>
      </div>
    );

    setIsScheduling(false);
    onOpenChange(false);
  };

  const quickDates = [
    { label: "Tomorrow", days: 1 },
    { label: "In 3 days", days: 3 },
    { label: "In 1 week", days: 7 },
    { label: "In 1 month", days: 30 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent" />
            Schedule Reminder
          </DialogTitle>
          <DialogDescription>
            Set up an automated reminder for {tenantName || "the tenant"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reminder Type */}
          <div className="space-y-2">
            <Label>Reminder Type</Label>
            <Select value={reminderType} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reminderTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Date Selection */}
          <div className="space-y-2">
            <Label>When to send</Label>
            <div className="flex flex-wrap gap-2">
              {quickDates.map((qd) => (
                <Button
                  key={qd.days}
                  variant="outline"
                  size="sm"
                  onClick={() => setScheduledDate(addDays(new Date(), qd.days))}
                  className={cn(
                    scheduledDate &&
                      format(scheduledDate, "yyyy-MM-dd") ===
                        format(addDays(new Date(), qd.days), "yyyy-MM-dd")
                      ? "border-accent bg-accent/10"
                      : ""
                  )}
                >
                  {qd.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Recurring */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Repeat className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Recurring Reminder</p>
                <p className="text-xs text-muted-foreground">Repeat automatically</p>
              </div>
            </div>
            <Checkbox
              checked={isRecurring}
              onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
            />
          </div>

          {isRecurring && (
            <Select value={recurringInterval} onValueChange={setRecurringInterval}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Every week</SelectItem>
                <SelectItem value="bi-weekly">Every 2 weeks</SelectItem>
                <SelectItem value="monthly">Every month</SelectItem>
                <SelectItem value="quarterly">Every 3 months</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your reminder message..."
              className="min-h-[100px]"
            />
          </div>

          {/* Delivery Channels */}
          <div className="space-y-3">
            <Label>Send via</Label>
            <div className="flex flex-wrap gap-3">
              <div
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                  sendEmail ? "border-accent bg-accent/10" : "border-border"
                )}
                onClick={() => setSendEmail(!sendEmail)}
              >
                <Checkbox checked={sendEmail} />
                <Mail className="h-4 w-4" />
                <span className="text-sm">Email</span>
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                  sendWhatsApp ? "border-accent bg-accent/10" : "border-border"
                )}
                onClick={() => setSendWhatsApp(!sendWhatsApp)}
              >
                <Checkbox checked={sendWhatsApp} />
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">WhatsApp</span>
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors opacity-50",
                  sendSMS ? "border-accent bg-accent/10" : "border-border"
                )}
                onClick={() => setSendSMS(!sendSMS)}
              >
                <Checkbox checked={sendSMS} />
                <span className="text-sm">📱 SMS</span>
                <Badge variant="secondary" className="text-xs">Soon</Badge>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={handleSchedule}
            disabled={isScheduling || !scheduledDate}
          >
            {isScheduling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Schedule Reminder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
