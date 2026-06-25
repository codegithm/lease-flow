import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  FileText,
  CreditCard,
  LayoutDashboard,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  UsersRound,
  Menu,
  X,
  Shield,
  Clock,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo, useEffect, useState } from "react";
import { useSidebar } from "./SidebarContext";
import { useSessionContext } from "@/hooks/use-session";
import { RoleHelper } from "@/lib/roles";
import { getConversations, getNotifications } from "@/lib/api";
import { ENABLE_BACKGROUND_POLLING, POLLING_INTERVALS } from "@/lib/polling";

// Base nav items for agents/staff
const agentNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Building2, label: "Units", href: "/units" },
  { icon: Users, label: "Applications", href: "/applications" },
  { icon: FileText, label: "Leases", href: "/leases" },
  { icon: CreditCard, label: "Payments", href: "/payments" },
  { icon: MessageSquare, label: "Messages", href: "/messages" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

// Nav items for tenants
const tenantNavItems = [
  { icon: Home, label: "My Portal", href: "/tenant-portal" },
  { icon: FileText, label: "My Leases", href: "/leases" },
  { icon: CreditCard, label: "Payments", href: "/payments" },
  { icon: MessageSquare, label: "Messages", href: "/messages" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

// Team management item for admins
const teamNavItem = { icon: UsersRound, label: "Team", href: "/team" };

// Configurations item for owners/admins
const configNavItem = {
  icon: Shield,
  label: "Configurations",
  href: "/configurations",
};

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

  // Fetch unread message count
  const { data: conversationsData } = useQuery({
    queryKey: ["sidebar-conversations"],
    queryFn: () => getConversations({ pageSize: 100 }),
    staleTime: 30000,
    refetchInterval: ENABLE_BACKGROUND_POLLING
      ? POLLING_INTERVALS.sidebarMs
      : false,
  });

  // Fetch unread notification count
  const { data: notificationsData } = useQuery({
    queryKey: ["sidebar-notifications"],
    queryFn: () => getNotifications({ unreadOnly: true, pageSize: 100 }),
    staleTime: 30000,
    refetchInterval: ENABLE_BACKGROUND_POLLING
      ? POLLING_INTERVALS.sidebarMs
      : false,
  });

  // Calculate unread counts
  const unreadMessages =
    conversationsData?.data?.reduce(
      (sum: number, c: { unreadCount?: number }) => sum + (c.unreadCount || 0),
      0,
    ) || 0;

  const unreadNotifications = notificationsData?.data?.length || 0;

  // Get user from localStorage and determine nav
  const { effectiveNav, userRole, userFullName } = useMemo(() => {
    let nav = agentNavItems;
    let role = "";
    let fullName = "User";

    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        role = u?.role ? String(u.role).toLowerCase() : "";
        fullName = u?.fullName || "User";

        if (RoleHelper.isTenant(role)) {
          // Tenant gets tenant-specific nav
          nav = tenantNavItems.map((t) => ({
            ...t,
            href:
              t.href === "/tenant-portal" && u?.id
                ? `/tenant-portal/${u.id}`
                : t.href,
          }));
        } else {
          // Agent/staff nav
          nav = [...agentNavItems];

          // Add Team link for privileged roles
          if (RoleHelper.canManageUsers(role)) {
            // Insert after Settings
            const settingsIndex = nav.findIndex((i) => i.href === "/settings");
            nav.splice(settingsIndex, 0, teamNavItem);
          }

          // Add Configurations link for roles with config access
          if (RoleHelper.canAccessConfig(role)) {
            // Insert after Team (or after Settings if Team wasn't added)
            const teamIndex = nav.findIndex((i) => i.href === "/team");
            if (teamIndex >= 0) {
              nav.splice(teamIndex + 1, 0, configNavItem);
            } else {
              const settingsIndex = nav.findIndex(
                (i) => i.href === "/settings",
              );
              nav.splice(settingsIndex, 0, configNavItem);
            }
          }
        }
      }
    } catch {
      // Keep default nav on parse error
    }

    return { effectiveNav: nav, userRole: role, userFullName: fullName };
  }, [location.pathname]); // Re-evaluate when location changes (in case user logged in)

  // Session management
  const {
    logout: sessionLogout,
    isSessionExpiring,
    timeUntilExpiry,
  } = useSessionContext();

  const handleLogout = () => {
    sessionLogout("You have been signed out");
  };

  // Format time remaining
  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  return (
    <>
      {/* Mobile header with hamburger */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between bg-sidebar px-4 lg:hidden border-b border-sidebar-border shadow-sm">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="font-display text-xl font-bold text-sidebar-foreground">
            LeaseFlow
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - hidden on mobile unless open */}
      <aside
        className={cn(
          "fixed left-0 top-16 lg:top-0 z-40 h-[calc(100vh-4rem)] lg:h-screen bg-sidebar transition-all duration-300 border-r border-sidebar-border",
          collapsed ? "lg:w-20" : "lg:w-64",
          // Mobile: hidden by default, slide in when open
          mobileOpen
            ? "w-64 translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo / Header - only visible on desktop */}
          <div className="hidden lg:flex h-16 items-center justify-between border-b border-sidebar-border px-3">
            {collapsed ? (
              // Collapsed: show expand button
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(false)}
                className="w-full text-sidebar-foreground hover:bg-sidebar-accent"
                title="Expand sidebar"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            ) : (
              // Expanded: show logo and collapse button
              <>
                <Link to="/dashboard" className="flex items-center">
                  <span className="font-display text-xl font-bold text-sidebar-foreground">
                    LeaseFlow
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCollapsed(true)}
                  className="text-sidebar-foreground hover:bg-sidebar-accent"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>

          {/* Mobile sidebar header with close button */}
          <div className="flex lg:hidden h-14 items-center justify-between border-b border-sidebar-border px-3">
            <span className="font-display text-lg font-bold text-sidebar-foreground">
              Menu
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2 lg:p-4 overflow-y-auto">
            {effectiveNav.map((item) => {
              const isActive = location.pathname === item.href;
              // Determine badge count based on nav item
              let badgeCount = 0;
              if (item.href === "/messages") badgeCount = unreadMessages;
              if (item.href === "/notifications")
                badgeCount = unreadNotifications;

              return (
                <Link key={item.href} to={item.href}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      collapsed && "lg:justify-center lg:px-2",
                    )}
                  >
                    <div className="relative">
                      <item.icon className="h-5 w-5 shrink-0" />
                      {/* Badge for collapsed sidebar */}
                      {collapsed && badgeCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center hidden lg:flex">
                          {badgeCount > 9 ? "9+" : badgeCount}
                        </span>
                      )}
                    </div>
                    {/* Always show label on mobile, hide when collapsed on desktop */}
                    <span className={cn(collapsed && "lg:hidden")}>
                      {item.label}
                    </span>
                    {/* Badge for expanded sidebar */}
                    {!collapsed && badgeCount > 0 && (
                      <Badge
                        variant="default"
                        className="ml-auto h-5 min-w-5 justify-center bg-accent text-accent-foreground text-xs"
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </Badge>
                    )}
                    {/* Badge for mobile (always expanded) */}
                    {badgeCount > 0 && (
                      <Badge
                        variant="default"
                        className="ml-auto h-5 min-w-5 justify-center bg-accent text-accent-foreground text-xs lg:hidden"
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </Badge>
                    )}
                    {isActive && !collapsed && badgeCount === 0 && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary hidden lg:block"
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-sidebar-border p-4">
            <div
              className={cn(
                "flex items-center gap-3",
                collapsed && "lg:justify-center",
              )}
            >
              <div className="h-10 w-10 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-sidebar-foreground">
                  {userFullName?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              {/* Always show on mobile, hide when collapsed on desktop */}
              <div className={cn("flex-1 min-w-0", collapsed && "lg:hidden")}>
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {userFullName}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate capitalize">
                  {userRole.replace("_", " ")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sign out"
                className={cn(
                  "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  collapsed && "lg:hidden",
                )}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
            {/* Collapsed logout button - desktop only */}
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sign out"
                className="mt-2 w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent hidden lg:flex"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
