import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddUnitDialog } from "@/components/dialogs/AddUnitDialog";
import { CreateApplicationLinkDialog } from "@/components/dialogs/CreateApplicationLinkDialog";
import { DateRangePickerDialog } from "@/components/dialogs/DateRangePickerDialog";
import { toast } from "sonner";
import { useEffect } from "react";
import { getUnits } from "@/lib/api";
import {
  Building2,
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  Clock,
  AlertTriangle,
} from "lucide-react";

const statsPlaceholder: any[] = [];
const recentApplications: any[] = [];
const alerts: any[] = [];

export default function Dashboard() {
  const navigate = useNavigate();
  const [showAddUnitDialog, setShowAddUnitDialog] = useState(false);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stats, setStats] = useState(statsPlaceholder);

  useEffect(() => {
    // Redirect tenants away from agent dashboard
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.role && String(u.role).toLowerCase() === "tenant") {
          // if tenant, send to tenant portal
          navigate(`/tenant-portal/${u.id}`);
          return;
        }
      }
    } catch {}
    (async () => {
      try {
        const units = await getUnits();
        const total = units.length;
        const active = units.filter((u: any) => u.status === "occupied").length;
        const occupancy = total > 0 ? Math.round((active / total) * 100) : 0;
        setStats([
          {
            title: "Total Units",
            value: String(total),
            change: "",
            trend: occupancy > 90 ? "up" : "neutral",
            icon: Building2,
          },
          {
            title: "Active Tenants",
            value: String(active),
            change: "",
            trend: "up",
            icon: Users,
          },
          {
            title: "Pending Applications",
            value: "0",
            change: "",
            trend: "neutral",
            icon: FileText,
          },
          {
            title: "Occupancy Rate",
            value: `${occupancy}%`,
            change: "",
            trend: occupancy >= 90 ? "up" : "down",
            icon: CreditCard,
          },
        ]);
      } catch (err) {
        console.warn("Failed to load dashboard stats", err);
      }
    })();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, here's what's happening today.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowDatePicker(true)}>
              <Clock className="h-4 w-4 mr-2" />
              Last 30 days
            </Button>
            <Button variant="accent" onClick={() => setShowAddUnitDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className="relative overflow-hidden cursor-pointer hover:border-accent/50 transition-colors"
                onClick={() => {
                  if (stat.title === "Total Units") navigate("/units");
                  else if (stat.title === "Pending Applications")
                    navigate("/applications");
                  else if (stat.title === "Monthly Revenue")
                    navigate("/payments");
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <stat.icon className="h-4 w-4 text-accent" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="flex items-center gap-1 text-xs">
                    {stat.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span
                      className={
                        stat.trend === "up"
                          ? "text-success"
                          : "text-destructive"
                      }
                    >
                      {stat.change}
                    </span>
                    <span className="text-muted-foreground">
                      from last month
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Applications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display text-lg">
                  Recent Applications
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/applications")}
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/applications/${app.id}`)}
                    >
                      <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-accent">
                          {app.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{app.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {app.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            app.status === "Approved"
                              ? "success"
                              : app.status === "In Review"
                              ? "accent"
                              : app.status === "Awaiting Docs"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {app.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {app.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Alerts & Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`rounded-lg p-4 ${
                        alert.type === "error"
                          ? "bg-destructive/10"
                          : alert.type === "warning"
                          ? "bg-warning/10"
                          : "bg-accent/10"
                      }`}
                    >
                      <p className="text-sm font-medium">{alert.message}</p>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto mt-1 text-xs"
                        onClick={() => navigate(alert.route)}
                      >
                        {alert.action}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="font-display text-lg">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowAddUnitDialog(true)}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Add New Unit
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowApplicationDialog(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Create Application Link
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => toast.success("Opening lease generator...")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Lease
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <AddUnitDialog
        open={showAddUnitDialog}
        onOpenChange={setShowAddUnitDialog}
      />
      <CreateApplicationLinkDialog
        open={showApplicationDialog}
        onOpenChange={setShowApplicationDialog}
      />
      <DateRangePickerDialog
        open={showDatePicker}
        onOpenChange={setShowDatePicker}
      />
    </DashboardLayout>
  );
}
