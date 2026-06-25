import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Mail,
  MessageSquare,
  CreditCard,
  FileText,
  Users,
  Building2,
  Clock,
  Settings,
  RefreshCw,
  User,
} from "lucide-react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/lib/api";
import { ENABLE_BACKGROUND_POLLING, POLLING_INTERVALS } from "@/lib/polling";

type NotificationType =
  | "application"
  | "payment"
  | "lease"
  | "maintenance"
  | "system"
  | "user";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

const typeConfig: Record<
  NotificationType,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  application: { icon: Users, color: "text-accent" },
  payment: { icon: CreditCard, color: "text-success" },
  lease: { icon: FileText, color: "text-warning" },
  maintenance: { icon: Building2, color: "text-destructive" },
  system: { icon: Bell, color: "text-muted-foreground" },
  user: { icon: User, color: "text-primary" },
};

const defaultSettings = [
  {
    id: "email_applications",
    label: "New Applications",
    description: "Get notified when new applications are submitted",
    email: true,
    push: true,
  },
  {
    id: "email_payments",
    label: "Payment Updates",
    description: "Receive alerts for payment success, failures, and overdue",
    email: true,
    push: true,
  },
  {
    id: "email_leases",
    label: "Lease Reminders",
    description: "Reminders for expiring leases and renewal deadlines",
    email: true,
    push: false,
  },
  {
    id: "email_maintenance",
    label: "Maintenance Requests",
    description: "Notifications for new maintenance tickets",
    email: false,
    push: true,
  },
  {
    id: "email_system",
    label: "System Updates",
    description: "Product updates and new feature announcements",
    email: true,
    push: false,
  },
];

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(defaultSettings);

  // Fetch notifications from API
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications({ pageSize: 100 }),
    refetchInterval: ENABLE_BACKGROUND_POLLING
      ? POLLING_INTERVALS.notificationsMs
      : false,
    staleTime: 10000,
  });

  const errorMessage =
    error instanceof Error && error.message
      ? error.message
      : "Please try again";

  const notifications: Notification[] = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Marked as read");
    },
    onError: () => toast.error("Failed to mark as read"),
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
    onError: () => toast.error("Failed to mark all as read"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification deleted");
    },
    onError: () => toast.error("Failed to delete notification"),
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) markReadMutation.mutate(notification.id);
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  const toggleSetting = (id: string, type: "email" | "push") => {
    setSettings(
      settings.map((s) => (s.id === id ? { ...s, [type]: !s[type] } : s)),
    );
    toast.success("Preference updated");
  };

  const renderNotificationItem = (
    notification: Notification,
    index: number,
  ) => {
    const config = typeConfig[notification.type] || typeConfig.system;
    const Icon = config.icon;

    return (
      <motion.div
        key={notification.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className={`p-4 flex gap-3 sm:gap-4 hover:bg-muted/50 transition-colors cursor-pointer ${
          !notification.isRead ? "bg-accent/5" : ""
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div
          className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 ${config.color}`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p
                className={`font-medium text-sm sm:text-base truncate ${
                  !notification.isRead
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {notification.title}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {notification.message}
              </p>
            </div>
            {!notification.isRead && (
              <div className="h-2 w-2 rounded-full bg-accent shrink-0 mt-2" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {notification.timestamp}
            </span>
            <div className="flex gap-1 sm:gap-2">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 sm:h-7 text-xs px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    markReadMutation.mutate(notification.id);
                  }}
                  disabled={markReadMutation.isPending}
                >
                  <Check className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Mark read</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 sm:h-7 text-xs px-2 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate(notification.id);
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderEmptyState = (
    message: string,
    subMessage: string,
    IconComponent = BellOff,
  ) => (
    <Card>
      <CardContent className="py-12 text-center">
        <IconComponent className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">{message}</h3>
        <p className="text-muted-foreground">{subMessage}</p>
      </CardContent>
    </Card>
  );

  const renderLoadingState = () => (
    <Card>
      <CardContent className="p-0 divide-y divide-border">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 flex gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              Notifications
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${
                    unreadCount !== 1 ? "s" : ""
                  }`
                : "You're all caught up!"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Mark All Read</span>
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger
              value="all"
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>All</span>
              {unreadCount > 0 && (
                <Badge
                  variant="accent"
                  className="ml-1 h-4 sm:h-5 min-w-4 sm:min-w-5 px-1 text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs sm:text-sm">
              Unread
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              renderLoadingState()
            ) : error ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    Failed to load notifications
                  </h3>
                  <p className="text-muted-foreground mb-4">{errorMessage}</p>
                  <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : notifications.length === 0 ? (
              renderEmptyState(
                "No notifications",
                "You don't have any notifications yet",
              )
            ) : (
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {notifications.map((notification, index) =>
                    renderNotificationItem(notification, index),
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            {isLoading ? (
              renderLoadingState()
            ) : notifications.filter((n) => !n.isRead).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCheck className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">
                    You have no unread notifications
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {notifications
                    .filter((n) => !n.isRead)
                    .map((notification, index) =>
                      renderNotificationItem(notification, index),
                    )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {settings.map((setting, index) => (
                  <div key={setting.id}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                      <div className="space-y-0.5">
                        <Label className="text-sm sm:text-base">
                          {setting.label}
                        </Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {setting.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={setting.email}
                            onCheckedChange={() =>
                              toggleSetting(setting.id, "email")
                            }
                          />
                          <Label className="text-xs sm:text-sm text-muted-foreground">
                            Email
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={setting.push}
                            onCheckedChange={() =>
                              toggleSetting(setting.id, "push")
                            }
                          />
                          <Label className="text-xs sm:text-sm text-muted-foreground">
                            Push
                          </Label>
                        </div>
                      </div>
                    </div>
                    {index < settings.length - 1 && (
                      <Separator className="mt-4 sm:mt-6" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  Quiet Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm sm:text-base">
                      Enable Quiet Hours
                    </Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Pause non-urgent notifications between 10 PM and 8 AM
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
