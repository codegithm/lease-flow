import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  getCurrentUser,
  getCompanyUsers,
  getAllPermissions,
  getUserPermissions,
  getUserPermissionOverrides,
  setUserPermission,
  removeUserPermission,
  bulkUpdateUserPermissions,
} from "@/lib/api";
import {
  Settings,
  Shield,
  Users,
  Search,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Info,
  Lock,
  Unlock,
  RotateCcw,
  Save,
  ChevronRight,
  Crown,
  UserCog,
} from "lucide-react";
import { RoleHelper, RoleName } from "@/lib/roles";

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
}

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleId: number;
  companyId: string;
  status: string;
  permissions: Record<string, boolean>;
}

interface CompanyUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleId: number;
  status: string;
}

interface PermissionOverride {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  isGranted: boolean;
  grantedAt: string;
  grantedBy: string;
}

export default function Configurations() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  const [userPermissions, setUserPermissions] = useState<
    Record<string, boolean>
  >({});
  const [userOverrides, setUserOverrides] = useState<PermissionOverride[]>([]);
  const [pendingChanges, setPendingChanges] = useState<
    Map<number, boolean | null>
  >(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const permissionsSectionRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [user, perms] = await Promise.all([
        getCurrentUser(),
        getAllPermissions(),
      ]);
      setCurrentUser(user);
      setPermissions(perms);

      if (user?.companyId) {
        const users = await getCompanyUsers(user.companyId);
        setCompanyUsers(users);
      }
    } catch (err) {
      console.error("Failed to load data", err);
      toast.error("Failed to load configuration data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPermissions = async (user: CompanyUser) => {
    setIsLoadingUser(true);
    setSelectedUser(user);
    setPendingChanges(new Map());
    try {
      const [effective, overrides] = await Promise.all([
        getUserPermissions(user.id),
        getUserPermissionOverrides(user.id).catch(() => []),
      ]);
      setUserPermissions(effective);
      setUserOverrides(overrides);

      // Scroll to permissions section after loading
      setTimeout(() => {
        permissionsSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (err) {
      console.error("Failed to load user permissions", err);
      toast.error("Failed to load user permissions");
    } finally {
      setIsLoadingUser(false);
    }
  };

  const canManagePermissions = () => {
    return RoleHelper.canAccessConfig(currentUser?.role);
  };

  const canModifyUser = (targetUser: CompanyUser) => {
    if (!currentUser) return false;
    return RoleHelper.canModifyUserPermissions(
      currentUser.role,
      targetUser.role,
      currentUser.id === targetUser.id
    );
  };

  const handlePermissionToggle = (
    permissionId: number,
    currentValue: boolean
  ) => {
    const newChanges = new Map(pendingChanges);
    const override = userOverrides.find((o) => o.permissionId === permissionId);

    // If there's no override and we're toggling, set the opposite of role default
    // If there's an override, toggle it or remove it
    if (override) {
      // If current override matches what we want, remove the override (reset to role default)
      if (override.isGranted === !currentValue) {
        newChanges.set(permissionId, null); // null means remove override
      } else {
        newChanges.set(permissionId, !currentValue);
      }
    } else {
      newChanges.set(permissionId, !currentValue);
    }

    setPendingChanges(newChanges);
  };

  const handleResetToDefault = (permissionId: number) => {
    const newChanges = new Map(pendingChanges);
    newChanges.set(permissionId, null); // null means reset/remove override
    setPendingChanges(newChanges);
  };

  const getEffectiveValue = (permissionId: number): boolean => {
    const perm = permissions.find((p) => p.id === permissionId);
    if (!perm) return false;

    // Check pending changes first
    if (pendingChanges.has(permissionId)) {
      const pendingValue = pendingChanges.get(permissionId);
      if (pendingValue === null) {
        // Reset to role default - need to check what that would be
        // For now, return the effective permission without overrides
        const override = userOverrides.find(
          (o) => o.permissionId === permissionId
        );
        if (override) {
          // If we're removing an override, return the opposite of what the override was
          return !override.isGranted;
        }
      }
      if (pendingValue !== null && pendingValue !== undefined) {
        return pendingValue;
      }
    }

    return userPermissions[perm.code] ?? false;
  };

  const hasOverride = (permissionId: number): boolean => {
    // If pending change is null, the override will be removed
    if (
      pendingChanges.has(permissionId) &&
      pendingChanges.get(permissionId) === null
    ) {
      return false;
    }
    // Check if there's a pending change or existing override
    if (pendingChanges.has(permissionId)) return true;
    return userOverrides.some((o) => o.permissionId === permissionId);
  };

  const isRestricted = (permissionId: number): boolean => {
    const override = userOverrides.find((o) => o.permissionId === permissionId);
    if (pendingChanges.has(permissionId)) {
      const pending = pendingChanges.get(permissionId);
      if (pending === null) return false;
      return pending === false;
    }
    return override ? !override.isGranted : false;
  };

  const handleSaveChanges = async () => {
    if (!selectedUser || pendingChanges.size === 0) return;

    setIsSaving(true);
    try {
      const updates: Array<{
        permissionId: number;
        isGranted: boolean;
        remove?: boolean;
      }> = [];

      pendingChanges.forEach((value, permissionId) => {
        if (value === null) {
          updates.push({ permissionId, isGranted: false, remove: true });
        } else {
          updates.push({ permissionId, isGranted: value });
        }
      });

      await bulkUpdateUserPermissions(selectedUser.id, updates);
      toast.success("Permissions updated successfully");

      // Reload user permissions
      await loadUserPermissions(selectedUser);
    } catch (err: any) {
      console.error("Failed to save permissions", err);
      toast.error(err?.message || "Failed to save permissions");
    } finally {
      setIsSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filteredUsers = companyUsers.filter((user) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      user.fullName?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.role?.toLowerCase().includes(q)
    );
  });

  const getInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U"
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role?.toLowerCase()) {
      case RoleName.OWNER:
        return <Crown className="h-3 w-3" />;
      case RoleName.ADMIN:
        return <Shield className="h-3 w-3" />;
      default:
        return <UserCog className="h-3 w-3" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case RoleName.OWNER:
        return "bg-amber-500/20 text-amber-500 border-amber-500/30";
      case RoleName.ADMIN:
        return "bg-purple-500/20 text-purple-500 border-purple-500/30";
      case RoleName.PROPERTY_MANAGER:
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case RoleName.LANDLORD:
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case RoleName.AGENT:
        return "bg-cyan-500/20 text-cyan-500 border-cyan-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!canManagePermissions()) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Shield className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground max-w-md">
            You don't have permission to access the configuration panel. Only
            owners and administrators can manage user permissions.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-accent" />
            Configurations
          </h1>
          <p className="text-muted-foreground">
            Manage user permissions and access controls for your company
          </p>
        </div>

        {/* Info Banner */}
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="flex items-start gap-4 pt-4">
            <Info className="h-5 w-5 text-accent mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-accent mb-1">
                Permission Management
              </p>
              <p className="text-muted-foreground">
                Each role has default permissions. You can grant additional
                permissions or restrict existing ones for individual users.
                Restricted permissions override role defaults.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* User List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Select a user to manage their permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    onClick={() => loadUserPermissions(user)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        loadUserPermissions(user);
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left cursor-pointer ${
                      selectedUser?.id === user.id
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50 hover:bg-muted/50"
                    } ${!canModifyUser(user) ? "opacity-60" : ""}`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {user.fullName || "Unknown"}
                        </p>
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        className={`text-xs ${getRoleBadgeColor(user.role)}`}
                      >
                        {getRoleIcon(user.role)}
                        <span className="ml-1 capitalize">
                          {user.role?.replace("_", " ")}
                        </span>
                      </Badge>
                      {!canModifyUser(user) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {user.id === currentUser?.id
                                ? "Cannot modify your own permissions"
                                : "Cannot modify this user's permissions"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Permission Editor */}
          <Card ref={permissionsSectionRef} className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Permission Editor
                  </CardTitle>
                  <CardDescription>
                    {selectedUser
                      ? `Managing permissions for ${selectedUser.fullName}`
                      : "Select a user to manage their permissions"}
                  </CardDescription>
                </div>
                {selectedUser && pendingChanges.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-warning/10 text-warning border-warning/30"
                    >
                      {pendingChanges.size} unsaved changes
                    </Badge>
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={handleSaveChanges}
                      disabled={isSaving || !canModifyUser(selectedUser)}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedUser ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a team member from the list to view and manage their
                    permissions
                  </p>
                </div>
              ) : isLoadingUser ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* User Info Banner */}
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {getInitials(selectedUser.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{selectedUser.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.email}
                      </p>
                    </div>
                    <Badge
                      className={`${getRoleBadgeColor(selectedUser.role)}`}
                    >
                      {getRoleIcon(selectedUser.role)}
                      <span className="ml-1 capitalize">
                        {selectedUser.role?.replace("_", " ")}
                      </span>
                    </Badge>
                    {!canModifyUser(selectedUser) && (
                      <Badge
                        variant="outline"
                        className="bg-destructive/10 text-destructive border-destructive/30"
                      >
                        <Lock className="h-3 w-3 mr-1" />
                        Read Only
                      </Badge>
                    )}
                  </div>

                  {/* Permission Categories */}
                  <Tabs
                    defaultValue={Object.keys(groupedPermissions)[0]}
                    className="space-y-4"
                  >
                    <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0">
                      {Object.keys(groupedPermissions).map((category) => (
                        <TabsTrigger
                          key={category}
                          value={category}
                          className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                        >
                          {category}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {Object.entries(groupedPermissions).map(
                      ([category, perms]) => (
                        <TabsContent
                          key={category}
                          value={category}
                          className="space-y-3"
                        >
                          {perms.map((perm) => {
                            const isGranted = getEffectiveValue(perm.id);
                            const hasCustomOverride = hasOverride(perm.id);
                            const restricted = isRestricted(perm.id);
                            const hasPendingChange = pendingChanges.has(
                              perm.id
                            );

                            return (
                              <motion.div
                                key={perm.id}
                                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                                  hasPendingChange
                                    ? "border-warning/50 bg-warning/5"
                                    : hasCustomOverride
                                    ? restricted
                                      ? "border-destructive/30 bg-destructive/5"
                                      : "border-success/30 bg-success/5"
                                    : "border-border bg-card"
                                }`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{perm.name}</p>
                                    {hasCustomOverride && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Badge
                                              variant="outline"
                                              className={`text-xs ${
                                                restricted
                                                  ? "bg-destructive/10 text-destructive border-destructive/30"
                                                  : "bg-success/10 text-success border-success/30"
                                              }`}
                                            >
                                              {restricted ? (
                                                <>
                                                  <Lock className="h-3 w-3 mr-1" />
                                                  Restricted
                                                </>
                                              ) : (
                                                <>
                                                  <Unlock className="h-3 w-3 mr-1" />
                                                  Granted
                                                </>
                                              )}
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Custom override - differs from role
                                            default
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    {hasPendingChange && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-warning/10 text-warning border-warning/30"
                                      >
                                        Pending
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {perm.description}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3">
                                  {hasCustomOverride &&
                                    canModifyUser(selectedUser) && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() =>
                                                handleResetToDefault(perm.id)
                                              }
                                            >
                                              <RotateCcw className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Reset to role default
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  <Switch
                                    checked={isGranted}
                                    onCheckedChange={() =>
                                      handlePermissionToggle(perm.id, isGranted)
                                    }
                                    disabled={!canModifyUser(selectedUser)}
                                  />
                                </div>
                              </motion.div>
                            );
                          })}
                        </TabsContent>
                      )
                    )}
                  </Tabs>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-border text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-card border border-border" />
                      <span>Role Default</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-success/20 border border-success/30" />
                      <span>Custom Grant</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/30" />
                      <span>Custom Restriction</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-warning/20 border border-warning/30" />
                      <span>Pending Change</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
