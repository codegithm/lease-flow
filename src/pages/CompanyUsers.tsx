import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Loader2,
  UserCheck,
  AlertTriangle,
  UserPlus,
  Mail,
  MoreVertical,
  RefreshCw,
  Crown,
  Ban,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleHelper } from "@/lib/roles";
import {
  getCurrentUser,
  getCompanyUsers,
  approveUser,
  blockUser,
  unblockUser,
  changeUserRole,
  getRoles,
  getUserInvitations,
  createUserInvitation,
  cancelUserInvitation,
} from "@/lib/api";

interface CompanyUser {
  id: string;
  email: string;
  fullName: string;
  cellNumber?: string;
  role: string;
  roleId: number | null;
  status: string;
  createdAt: string;
  approvedAt: string | null;
}

interface UserInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  canCreateCompany: boolean;
  canManageUsers: boolean;
  canApproveAccounts: boolean;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive"; icon: React.ElementType }> = {
  Active: { label: "Active", variant: "success", icon: CheckCircle2 },
  active: { label: "Active", variant: "success", icon: CheckCircle2 },
  Provisional: { label: "Pending Approval", variant: "warning", icon: Clock },
  provisional: { label: "Pending Approval", variant: "warning", icon: Clock },
  Blocked: { label: "Blocked", variant: "destructive", icon: XCircle },
  blocked: { label: "Blocked", variant: "destructive", icon: XCircle },
  Inactive: { label: "Inactive", variant: "secondary", icon: XCircle },
};

const roleDisplayMap: Record<string, string> = {
  owner: "Owner",
  admin: "Company Admin",
  property_manager: "Property Manager",
  landlord: "Landlord",
  agent: "Leasing Agent",
  tenant: "Tenant",
};

const roleColorMap: Record<string, string> = {
  owner: "bg-purple-500/10 text-purple-600",
  admin: "bg-red-500/10 text-red-600",
  property_manager: "bg-blue-500/10 text-blue-600",
  landlord: "bg-green-500/10 text-green-600",
  agent: "bg-orange-500/10 text-orange-600",
  tenant: "bg-muted text-muted-foreground",
};

export default function CompanyUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("users");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: "approve" | "block" | "unblock"; user: CompanyUser | null }>({ open: false, action: "approve", user: null });
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; user: CompanyUser | null; newRole: string }>({ open: false, user: null, newRole: "" });
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const currentUser = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const canManageUsers = () => RoleHelper.canManageUsers(currentUser?.role);

  const canChangeRole = (targetRole: string) => {
    const myRole = currentUser?.role?.toLowerCase();
    const target = targetRole?.toLowerCase();
    if (target === "owner") return false;
    if (target === "admin" && myRole !== "owner") return false;
    if (myRole === "owner") return target !== "owner";
    if (myRole === "admin") return target !== "owner" && target !== "admin";
    return false;
  };

  useEffect(() => {
    if (!canManageUsers()) {
      toast.error("You don't have permission to manage users");
      navigate("/dashboard");
      return;
    }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const profile = await getCurrentUser().catch(() => null);
      const companyId = profile?.companyId || currentUser?.companyId;
      if (!companyId) { setIsLoading(false); return; }
      const [usersData, rolesData, invitesData] = await Promise.all([
        getCompanyUsers(companyId),
        getRoles(),
        getUserInvitations(companyId).catch(() => []),
      ]);
      setUsers((usersData || []).map((u: any) => ({ ...u, status: u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : "Unknown" })));
      setRoles(rolesData || []);
      setInvitations((invitesData || []) as UserInvitation[]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (user: CompanyUser) => {
    setActionLoading(user.id);
    try {
      await approveUser(currentUser?.companyId, user.id);
      toast.success(`${user.fullName || user.email} has been approved`);
      await fetchAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve user");
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, action: "approve", user: null });
    }
  };

  const handleBlock = async (user: CompanyUser) => {
    setActionLoading(user.id);
    try {
      await blockUser(currentUser?.companyId, user.id);
      toast.success(`${user.fullName || user.email} has been blocked`);
      await fetchAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to block user");
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, action: "block", user: null });
    }
  };

  const handleUnblock = async (user: CompanyUser) => {
    setActionLoading(user.id);
    try {
      await unblockUser(currentUser?.companyId, user.id);
      toast.success(`${user.fullName || user.email} has been unblocked`);
      await fetchAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to unblock user");
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, action: "unblock", user: null });
    }
  };

  const handleRoleChange = async () => {
    if (!roleDialog.user || !roleDialog.newRole) return;
    setActionLoading(roleDialog.user.id);
    try {
      await changeUserRole(currentUser?.companyId, roleDialog.user.id, roleDialog.newRole);
      toast.success(`Role updated to ${roleDisplayMap[roleDialog.newRole] || roleDialog.newRole}`);
      await fetchAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update role");
    } finally {
      setActionLoading(null);
      setRoleDialog({ open: false, user: null, newRole: "" });
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    const companyId = currentUser?.companyId;
    if (!companyId) { toast.error("No company found"); return; }
    setIsSendingInvite(true);
    try {
      await createUserInvitation(companyId, inviteEmail, inviteRole, currentUser?.id);
      const { supabase } = await import("@/lib/supabase");
      await supabase.auth.resetPasswordForEmail(inviteEmail, {
        redirectTo: `${window.location.origin}/signin?invite=1&companyId=${companyId}`,
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("agent");
      setInviteDialog(false);
      await fetchAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send invitation");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    try {
      await cancelUserInvitation(id);
      toast.success("Invitation cancelled");
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel invitation");
    }
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return user.email?.toLowerCase().includes(q) || user.fullName?.toLowerCase().includes(q) || user.role?.toLowerCase().includes(q);
  });

  const pendingCount = users.filter((u) => u.status === "Provisional" || u.status === "provisional").length;
  const activeCount = users.filter((u) => u.status === "Active" || u.status === "active").length;
  const blockedCount = users.filter((u) => u.status === "Blocked" || u.status === "blocked").length;
  const pendingInvites = invitations.filter((i) => i.status === "pending").length;

  if (!canManageUsers()) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Team Management</h1>
            <p className="text-muted-foreground mt-1">Manage users, roles, and invitations for your company</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="accent" size="sm" onClick={() => setInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Users", value: users.length, icon: Users, color: "text-accent", bg: "bg-accent/10" },
            { label: "Active", value: activeCount, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
            { label: "Pending", value: pendingCount, icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
            { label: "Blocked", value: blockedCount, icon: Ban, color: "text-red-500", bg: "bg-red-500/10" },
            { label: "Pending Invites", value: pendingInvites, icon: Mail, color: "text-blue-500", bg: "bg-blue-500/10" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span><strong>{pendingCount}</strong> user{pendingCount > 1 ? "s are" : " is"} waiting for approval</span>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users ({users.length})
              </TabsTrigger>
              <TabsTrigger value="invitations" className="gap-2">
                <Mail className="h-4 w-4" />
                Invitations
                {pendingInvites > 0 && <Badge variant="warning" className="ml-1 text-xs px-1.5 py-0">{pendingInvites}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle>Company Users</CardTitle>
                      <CardDescription>View and manage all users in your organisation</CardDescription>
                    </div>
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No users found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead className="hidden md:table-cell">Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden md:table-cell">Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user) => {
                            const config = statusConfig[user.status] || statusConfig.Inactive;
                            const StatusIcon = config.icon;
                            const isCurrentUser = user.id === currentUser?.id;
                            const roleColor = roleColorMap[user.role?.toLowerCase()] || "bg-muted text-muted-foreground";
                            return (
                              <TableRow key={user.id} className={(user.status === "Provisional" || user.status === "provisional") ? "bg-warning/5" : undefined}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                                      <span className="text-sm font-medium">{user.fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}</span>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{user.fullName || "—"}{isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}</p>
                                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                      {user.cellNumber && <p className="text-xs text-muted-foreground hidden md:block">{user.cellNumber}</p>}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <Badge className={`${roleColor} border-0 capitalize text-xs`}>
                                    {roleDisplayMap[user.role?.toLowerCase()] || user.role?.replace("_", " ") || "—"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={config.variant} className="gap-1 text-xs">
                                    <StatusIcon className="h-3 w-3" />
                                    <span className="hidden sm:inline">{config.label}</span>
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                  {new Date(user.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  {!isCurrentUser ? (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={actionLoading === user.id}>
                                          {actionLoading === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {(user.status === "Provisional" || user.status === "provisional") && (
                                          <DropdownMenuItem className="text-green-600" onClick={() => setConfirmDialog({ open: true, action: "approve", user })}>
                                            <UserCheck className="h-4 w-4 mr-2" />Approve User
                                          </DropdownMenuItem>
                                        )}
                                        {canChangeRole(user.role) && (
                                          <DropdownMenuItem onClick={() => setRoleDialog({ open: true, user, newRole: user.role })}>
                                            <Crown className="h-4 w-4 mr-2" />Change Role
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        {(user.status === "Active" || user.status === "active") && (
                                          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDialog({ open: true, action: "block", user })}>
                                            <Ban className="h-4 w-4 mr-2" />Block User
                                          </DropdownMenuItem>
                                        )}
                                        {(user.status === "Blocked" || user.status === "blocked") && (
                                          <DropdownMenuItem className="text-green-600" onClick={() => setConfirmDialog({ open: true, action: "unblock", user })}>
                                            <Shield className="h-4 w-4 mr-2" />Unblock User
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  ) : (
                                    <span className="text-xs text-muted-foreground pr-2">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invitations">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>User Invitations</CardTitle>
                      <CardDescription>Pending and past invitations</CardDescription>
                    </div>
                    <Button variant="accent" size="sm" onClick={() => setInviteDialog(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />New Invite
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {invitations.length === 0 ? (
                    <div className="text-center py-12">
                      <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No invitations sent yet</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => setInviteDialog(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />Send First Invitation
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invitations.map((inv) => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-medium">{inv.email}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize text-xs">{roleDisplayMap[inv.role] || inv.role}</Badge>
                              </TableCell>
                              <TableCell>
                                {inv.status === "pending" ? (
                                  <Badge variant="warning" className="text-xs gap-1"><Clock className="h-3 w-3" />Pending</Badge>
                                ) : inv.status === "accepted" ? (
                                  <Badge variant="success" className="text-xs gap-1"><CheckCircle2 className="h-3 w-3" />Accepted</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs capitalize">{inv.status}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(inv.expiresAt) < new Date() ? <span className="text-destructive">Expired</span> : new Date(inv.expiresAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {inv.status === "pending" && (
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs" onClick={() => handleCancelInvite(inv.id)}>
                                    <XCircle className="h-3 w-3 mr-1" />Cancel
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Confirm Dialog */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.action === "approve" && "Approve User"}
                {confirmDialog.action === "block" && "Block User"}
                {confirmDialog.action === "unblock" && "Unblock User"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.action === "approve" && <>Approve <strong>{confirmDialog.user?.fullName || confirmDialog.user?.email}</strong>? They will be able to sign in.</>}
                {confirmDialog.action === "block" && <>Block <strong>{confirmDialog.user?.fullName || confirmDialog.user?.email}</strong>? They will no longer be able to sign in.</>}
                {confirmDialog.action === "unblock" && <>Unblock <strong>{confirmDialog.user?.fullName || confirmDialog.user?.email}</strong>? They will be able to sign in again.</>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!confirmDialog.user) return;
                  if (confirmDialog.action === "approve") handleApprove(confirmDialog.user);
                  if (confirmDialog.action === "block") handleBlock(confirmDialog.user);
                  if (confirmDialog.action === "unblock") handleUnblock(confirmDialog.user);
                }}
                className={confirmDialog.action === "block" ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-700"}
              >
                {confirmDialog.action === "approve" && "Approve"}
                {confirmDialog.action === "block" && "Block"}
                {confirmDialog.action === "unblock" && "Unblock"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Role Change Dialog */}
        <Dialog open={roleDialog.open} onOpenChange={(open) => !open && setRoleDialog({ open: false, user: null, newRole: "" })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Role</DialogTitle>
              <DialogDescription>Update the role for <strong>{roleDialog.user?.fullName || roleDialog.user?.email}</strong></DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Current Role</Label>
                <div className="p-2 rounded border bg-muted/50 text-sm">{roleDisplayMap[roleDialog.user?.role?.toLowerCase() || ""] || roleDialog.user?.role || "—"}</div>
              </div>
              <div className="space-y-2">
                <Label>New Role</Label>
                <Select value={roleDialog.newRole} onValueChange={(v) => setRoleDialog((d) => ({ ...d, newRole: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent>
                    {roles.filter((r) => {
                      const n = r.name.toLowerCase();
                      const myRole = currentUser?.role?.toLowerCase();
                      if (n === "owner" || n === "tenant") return false;
                      if (n === "admin" && myRole !== "owner") return false;
                      return true;
                    }).map((r) => (
                      <SelectItem key={r.id} value={r.name}>{roleDisplayMap[r.name.toLowerCase()] || r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Role changes take effect immediately.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleDialog({ open: false, user: null, newRole: "" })}>Cancel</Button>
              <Button variant="accent" onClick={handleRoleChange} disabled={!roleDialog.newRole || actionLoading === roleDialog.user?.id}>
                {actionLoading === roleDialog.user?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
                Update Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invite Dialog */}
        <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>Send an invitation email to add a new user to your company. They will receive an email to set their password and join your workspace.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email Address *</Label>
                <Input id="inviteEmail" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendInvite()} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.filter((r) => r.name.toLowerCase() !== "tenant" && r.name.toLowerCase() !== "owner").map((r) => (
                      <SelectItem key={r.id} value={r.name}>{roleDisplayMap[r.name.toLowerCase()] || r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialog(false)}>Cancel</Button>
              <Button variant="accent" onClick={handleSendInvite} disabled={isSendingInvite}>
                {isSendingInvite ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}