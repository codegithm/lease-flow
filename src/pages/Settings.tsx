import { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getCurrentUser,
  updateCurrentUser,
  updateCompany,
  getCompanyUsers,
  changeUserRole,
  approveUser,
  blockUser,
  unblockUser,
  getRoles,
  getCompanyBankingDetails,
  saveCompanyBankingDetails,
  getCompanyChargeConfigs,
  saveCompanyChargeConfig,
  deleteCompanyChargeConfig,
  type BankingDetailsRecord,
  type ChargeConfigRecord,
} from "@/lib/api";
import {
  User,
  Building2,
  CreditCard,
  Shield,
  Bell,
  Palette,
  Globe,
  Users,
  Key,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  X,
  Ban,
  UserCheck,
  Landmark,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Pencil,
  AlertCircle,
  Receipt,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  cellNumber: string;
  role: string;
  roleId: number;
  companyId: string;
  companyName?: string;
  companyAddress?: string;
  status: string;
  permissions?: Record<string, boolean>;
  createdAt?: string;
}

interface CompanyUser {
  id: string;
  email: string;
  fullName: string;
  cellNumber?: string;
  role: string;
  roleId: number;
  status: string;
  createdAt?: string;
  approvedAt?: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  canCreateCompany: boolean;
  canManageUsers: boolean;
  canApproveAccounts: boolean;
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  return fallback;
}

export default function Settings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Banking state
  const [bankingDetails, setBankingDetails] =
    useState<BankingDetailsRecord | null>(null);
  const [bankingForm, setBankingForm] = useState<
    Omit<BankingDetailsRecord, "id" | "companyId">
  >({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    branchCode: "",
    branchName: "",
    accountType: "Current",
    swiftCode: "",
    vatNumber: "",
    registrationNumber: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [isSavingBanking, setIsSavingBanking] = useState(false);
  const [isLoadingBanking, setIsLoadingBanking] = useState(false);

  // Charge configs state
  const [chargeConfigs, setChargeConfigs] = useState<ChargeConfigRecord[]>([]);
  const [isLoadingCharges, setIsLoadingCharges] = useState(false);
  const [showChargeDialog, setShowChargeDialog] = useState(false);
  const [editingCharge, setEditingCharge] = useState<ChargeConfigRecord | null>(
    null,
  );
  const [chargeForm, setChargeForm] = useState({
    chargeType: "",
    name: "",
    description: "",
    amount: 0,
    isEnabled: true,
    isFixed: false,
    taxRate: 0,
    displayOrder: 0,
  });
  const [isSavingCharge, setIsSavingCharge] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const data = await getCurrentUser();
        setProfile(data);
        // Split fullName into first/last
        const parts = (data.fullName || "").split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
        setPhone(data.cellNumber || "");
        setCompanyName(data.companyName || "");
        setCompanyAddress(data.companyAddress || "");
      } catch (err) {
        console.error("Failed to load profile", err);
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (err) {
      console.error("Failed to load roles", err);
    }
  };

  const loadBankingDetails = async (companyId: string) => {
    setIsLoadingBanking(true);
    try {
      const data = await getCompanyBankingDetails(companyId);
      setBankingDetails(data);
      if (data) {
        setBankingForm({
          bankName: data.bankName || "",
          accountHolder: data.accountHolder || "",
          accountNumber: data.accountNumber || "",
          branchCode: data.branchCode || "",
          branchName: data.branchName || "",
          accountType: data.accountType || "Current",
          swiftCode: data.swiftCode || "",
          vatNumber: data.vatNumber || "",
          registrationNumber: data.registrationNumber || "",
          contactEmail: data.contactEmail || "",
          contactPhone: data.contactPhone || "",
        });
      }
    } catch (err) {
      console.error("Failed to load banking details", err);
    } finally {
      setIsLoadingBanking(false);
    }
  };

  const loadChargeConfigs = async (companyId: string) => {
    setIsLoadingCharges(true);
    try {
      const data = await getCompanyChargeConfigs(companyId);
      setChargeConfigs(data);
    } catch (err) {
      console.error("Failed to load charge configs", err);
    } finally {
      setIsLoadingCharges(false);
    }
  };

  const handleSaveBanking = async () => {
    if (!profile?.companyId) return;
    if (
      !bankingForm.bankName ||
      !bankingForm.accountHolder ||
      !bankingForm.accountNumber
    ) {
      toast.error("Bank name, account holder, and account number are required");
      return;
    }
    setIsSavingBanking(true);
    try {
      const saved = await saveCompanyBankingDetails(
        profile.companyId,
        bankingForm,
      );
      setBankingDetails(saved);
      toast.success("Banking details saved successfully");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save banking details"));
    } finally {
      setIsSavingBanking(false);
    }
  };

  const openNewChargeDialog = () => {
    setEditingCharge(null);
    setChargeForm({
      chargeType: "",
      name: "",
      description: "",
      amount: 0,
      isEnabled: true,
      isFixed: false,
      taxRate: 0,
      displayOrder: chargeConfigs.length,
    });
    setShowChargeDialog(true);
  };

  const openEditChargeDialog = (c: ChargeConfigRecord) => {
    setEditingCharge(c);
    setChargeForm({
      chargeType: c.chargeType,
      name: c.name,
      description: c.description || "",
      amount: c.amount,
      isEnabled: c.isEnabled,
      isFixed: c.isFixed,
      taxRate: c.taxRate,
      displayOrder: c.displayOrder,
    });
    setShowChargeDialog(true);
  };

  const handleSaveCharge = async () => {
    if (!profile?.companyId) return;
    if (!chargeForm.chargeType || !chargeForm.name) {
      toast.error("Charge type and name are required");
      return;
    }
    setIsSavingCharge(true);
    try {
      await saveCompanyChargeConfig(profile.companyId, chargeForm);
      await loadChargeConfigs(profile.companyId);
      setShowChargeDialog(false);
      toast.success(editingCharge ? "Charge updated" : "Charge added");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save charge"));
    } finally {
      setIsSavingCharge(false);
    }
  };

  const handleDeleteCharge = async (id: string) => {
    if (!profile?.companyId) return;
    try {
      await deleteCompanyChargeConfig(id);
      setChargeConfigs((prev) => prev.filter((c) => c.id !== id));
      toast.success("Charge removed");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to delete charge"));
    }
  };

  const loadCompanyUsers = async () => {
    if (!profile?.companyId) return;
    setLoadingUsers(true);
    try {
      const data = await getCompanyUsers(profile.companyId);
      setCompanyUsers(data);
    } catch (err) {
      console.error("Failed to load company users", err);
      toast.error("Failed to load team members");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      await updateCurrentUser({ fullName, cellNumber: phone });
      toast.success("Profile saved successfully");
      // Update local state
      if (profile) {
        setProfile({ ...profile, fullName, cellNumber: phone });
      }
    } catch (err: unknown) {
      console.error("Failed to save profile", err);
      toast.error(getErrorMessage(err, "Failed to save profile"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!profile?.companyId) return;
    setIsSavingCompany(true);
    try {
      await updateCompany(profile.companyId, {
        name: companyName,
        address: companyAddress,
      });
      toast.success("Company settings saved");
      // Update local state
      setProfile({ ...profile, companyName, companyAddress });
    } catch (err: unknown) {
      console.error("Failed to save company", err);
      toast.error(getErrorMessage(err, "Failed to save company settings"));
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!profile?.companyId) return;
    try {
      await changeUserRole(profile.companyId, userId, newRole);
      toast.success("Role updated successfully");
      // Reload users
      loadCompanyUsers();
    } catch (err: unknown) {
      console.error("Failed to change role", err);
      toast.error(getErrorMessage(err, "Failed to change role"));
    }
  };

  const handleApproveUser = async (userId: string) => {
    if (!profile?.companyId) return;
    try {
      await approveUser(profile.companyId, userId);
      toast.success("User approved");
      loadCompanyUsers();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to approve user"));
    }
  };

  const handleBlockUser = async (userId: string) => {
    if (!profile?.companyId) return;
    try {
      await blockUser(profile.companyId, userId);
      toast.success("User blocked");
      loadCompanyUsers();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to block user"));
    }
  };

  const handleUnblockUser = async (userId: string) => {
    if (!profile?.companyId) return;
    try {
      await unblockUser(profile.companyId, userId);
      toast.success("User unblocked");
      loadCompanyUsers();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to unblock user"));
    }
  };

  const canManageUsers =
    profile?.role?.toLowerCase() === "owner" ||
    profile?.role?.toLowerCase() === "admin" ||
    profile?.role?.toLowerCase() === "property_manager" ||
    profile?.role?.toLowerCase() === "landlord";

  const canChangeRole = (targetRole: string) => {
    const myRole = profile?.role?.toLowerCase();
    const target = targetRole?.toLowerCase();

    // Owner role cannot be changed
    if (target === "owner") return false;

    // Only owners can change admins
    if (target === "admin" && myRole !== "owner") return false;

    // Admins can change non-owner, non-admin
    if (myRole === "admin") return target !== "owner" && target !== "admin";

    // Owners can change anyone except other owners
    if (myRole === "owner") return target !== "owner";

    return false;
  };

  const getInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U"
    );
  };

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      owner: "Owner",
      admin: "Company Admin",
      property_manager: "Property Manager",
      landlord: "Landlord",
      agent: "Leasing Agent",
      tenant: "Tenant",
    };
    return roleMap[role?.toLowerCase()] || role;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return (
          <Badge className="bg-success/20 text-success border-0">Active</Badge>
        );
      case "provisional":
        return (
          <Badge className="bg-warning/20 text-warning border-0">Pending</Badge>
        );
      case "blocked":
        return (
          <Badge className="bg-destructive/20 text-destructive border-0">
            Blocked
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  return (
    <>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="font-display text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account and company settings
            </p>
          </div>

          <Tabs
            defaultValue="profile"
            className="space-y-6"
            onValueChange={(val) => {
              if (val === "team" && companyUsers.length === 0) {
                loadCompanyUsers();
              }
              if (val === "banking" && profile?.companyId) {
                loadBankingDetails(profile.companyId);
              }
              if (
                val === "charges" &&
                profile?.companyId &&
                chargeConfigs.length === 0
              ) {
                loadChargeConfigs(profile.companyId);
              }
            }}
          >
            <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0">
              <TabsTrigger
                value="profile"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-2"
              >
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="company"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-2"
              >
                <Building2 className="h-4 w-4" />
                Company
              </TabsTrigger>
              {canManageUsers && (
                <TabsTrigger
                  value="team"
                  className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-2"
                >
                  <Users className="h-4 w-4" />
                  Team
                </TabsTrigger>
              )}
              <TabsTrigger
                value="billing"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Billing
              </TabsTrigger>
              {canManageUsers && (
                <TabsTrigger
                  value="banking"
                  className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-2"
                >
                  <Landmark className="h-4 w-4" />
                  Banking
                </TabsTrigger>
              )}
              {canManageUsers && (
                <TabsTrigger
                  value="charges"
                  className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  Charges
                </TabsTrigger>
              )}
              <TabsTrigger
                value="security"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-2"
              >
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger
                value="integrations"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-2"
              >
                <Globe className="h-4 w-4" />
                Integrations
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Update your personal details and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-6">
                      <Avatar className="h-20 w-20">
                        <AvatarFallback className="text-xl">
                          {getInitials(profile?.fullName || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm">
                          <Camera className="h-4 w-4 mr-2" />
                          Change Photo
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG or GIF. Max 2MB.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={profile?.email || ""}
                          className="pl-10"
                          disabled
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Contact support to change your email address
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Input
                        id="role"
                        value={getRoleDisplay(profile?.role || "")}
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Your role is managed by company administrators
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="accent"
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                      >
                        {isSavingProfile ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Company Tab */}
            <TabsContent value="company" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Company Details</CardTitle>
                    <CardDescription>
                      Manage your company information and branding
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="companyId">Company ID</Label>
                      <Input
                        id="companyId"
                        value={profile?.companyId || ""}
                        readOnly
                      />
                      <p className="text-xs text-muted-foreground">
                        Share this ID with teammates so they can join your
                        company during registration.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        disabled={!canManageUsers}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Business Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          id="address"
                          value={companyAddress}
                          onChange={(e) => setCompanyAddress(e.target.value)}
                          className="pl-10 min-h-[80px]"
                          disabled={!canManageUsers}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select defaultValue="est">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pst">
                              Pacific Time (PT)
                            </SelectItem>
                            <SelectItem value="mst">
                              Mountain Time (MT)
                            </SelectItem>
                            <SelectItem value="cst">
                              Central Time (CT)
                            </SelectItem>
                            <SelectItem value="est">
                              Eastern Time (ET)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select defaultValue="usd">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="usd">USD ($)</SelectItem>
                            <SelectItem value="zar">ZAR (R)</SelectItem>
                            <SelectItem value="eur">EUR (€)</SelectItem>
                            <SelectItem value="gbp">GBP (£)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {canManageUsers && (
                      <div className="flex justify-end">
                        <Button
                          variant="accent"
                          onClick={handleSaveCompany}
                          disabled={isSavingCompany}
                        >
                          {isSavingCompany ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Team Tab */}
            {canManageUsers && (
              <TabsContent value="team" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Team Members</CardTitle>
                        <CardDescription>
                          Manage who has access to your account
                        </CardDescription>
                      </div>
                      <Button
                        variant="accent"
                        onClick={() => toast.info("Invite feature coming soon")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {loadingUsers ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-accent" />
                        </div>
                      ) : companyUsers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No team members found
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {companyUsers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-4 rounded-lg border border-border"
                            >
                              <div className="flex items-center gap-4">
                                <Avatar>
                                  <AvatarFallback>
                                    {getInitials(member.fullName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">
                                      {member.fullName || "Unknown"}
                                    </p>
                                    {getStatusBadge(member.status)}
                                    {member.id === profile?.id && (
                                      <Badge variant="outline">You</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <Select
                                  value={member.role?.toLowerCase()}
                                  onValueChange={(val) =>
                                    handleRoleChange(member.id, val)
                                  }
                                  disabled={
                                    !canChangeRole(member.role) ||
                                    member.id === profile?.id
                                  }
                                >
                                  <SelectTrigger className="w-[160px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roles
                                      .filter(
                                        (r) =>
                                          r.name.toLowerCase() !== "tenant" &&
                                          r.name.toLowerCase() !== "owner",
                                      )
                                      .map((role) => (
                                        <SelectItem
                                          key={role.id}
                                          value={role.name.toLowerCase()}
                                        >
                                          {getRoleDisplay(role.name)}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {member.id !== profile?.id &&
                                  member.role?.toLowerCase() !== "owner" && (
                                    <div className="flex gap-1">
                                      {member.status?.toLowerCase() ===
                                        "provisional" && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-success hover:text-success"
                                          onClick={() =>
                                            handleApproveUser(member.id)
                                          }
                                          title="Approve user"
                                        >
                                          <UserCheck className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {member.status?.toLowerCase() ===
                                        "active" && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() =>
                                            handleBlockUser(member.id)
                                          }
                                          title="Block user"
                                        >
                                          <Ban className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {member.status?.toLowerCase() ===
                                        "blocked" && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-success hover:text-success"
                                          onClick={() =>
                                            handleUnblockUser(member.id)
                                          }
                                          title="Unblock user"
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            )}

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>
                      Manage your subscription and billing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-accent/10 border border-accent/20">
                      <div>
                        <p className="font-semibold text-lg">
                          Professional Plan
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Up to 100 units, unlimited team members
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          $99
                          <span className="text-sm font-normal text-muted-foreground">
                            /mo
                          </span>
                        </p>
                        <Button
                          variant="link"
                          className="h-auto p-0 text-accent"
                        >
                          Upgrade Plan
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Banking Tab */}
            <TabsContent value="banking" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Landmark className="h-5 w-5" />
                      Company Banking Details
                    </CardTitle>
                    <CardDescription>
                      These details appear on tenant invoices. Each company must
                      use a unique bank account number.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingBanking ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-accent" />
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {bankingDetails && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
                            <Check className="h-4 w-4 flex-shrink-0" />
                            Banking details are configured and will appear on
                            invoices.
                          </div>
                        )}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Bank Name *</Label>
                            <Input
                              placeholder="e.g. First National Bank"
                              value={bankingForm.bankName}
                              onChange={(e) =>
                                setBankingForm((f) => ({
                                  ...f,
                                  bankName: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Account Holder Name *</Label>
                            <Input
                              placeholder="Name as it appears on bank account"
                              value={bankingForm.accountHolder}
                              onChange={(e) =>
                                setBankingForm((f) => ({
                                  ...f,
                                  accountHolder: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Account Number *</Label>
                            <Input
                              placeholder="Bank account number"
                              value={bankingForm.accountNumber}
                              onChange={(e) =>
                                setBankingForm((f) => ({
                                  ...f,
                                  accountNumber: e.target.value,
                                }))
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              Must be unique across all companies.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Account Type</Label>
                            <Select
                              value={bankingForm.accountType}
                              onValueChange={(v) =>
                                setBankingForm((f) => ({
                                  ...f,
                                  accountType: v,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Current">
                                  Current Account
                                </SelectItem>
                                <SelectItem value="Savings">
                                  Savings Account
                                </SelectItem>
                                <SelectItem value="Transmission">
                                  Transmission Account
                                </SelectItem>
                                <SelectItem value="Cheque">
                                  Cheque Account
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Branch Code</Label>
                            <Input
                              placeholder="e.g. 250655"
                              value={bankingForm.branchCode || ""}
                              onChange={(e) =>
                                setBankingForm((f) => ({
                                  ...f,
                                  branchCode: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Branch Name</Label>
                            <Input
                              placeholder="e.g. Sandton"
                              value={bankingForm.branchName || ""}
                              onChange={(e) =>
                                setBankingForm((f) => ({
                                  ...f,
                                  branchName: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>SWIFT / BIC Code</Label>
                            <Input
                              placeholder="International transfers"
                              value={bankingForm.swiftCode || ""}
                              onChange={(e) =>
                                setBankingForm((f) => ({
                                  ...f,
                                  swiftCode: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>VAT Number</Label>
                            <Input
                              placeholder="Company VAT registration"
                              value={bankingForm.vatNumber || ""}
                              onChange={(e) =>
                                setBankingForm((f) => ({
                                  ...f,
                                  vatNumber: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Company Registration No.</Label>
                            <Input
                              placeholder="e.g. 2020/123456/07"
                              value={bankingForm.registrationNumber || ""}
                              onChange={(e) =>
                                setBankingForm((f) => ({
                                  ...f,
                                  registrationNumber: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Contact Email</Label>
                            <Input
                              type="email"
                              placeholder="billing@company.com"
                              value={bankingForm.contactEmail || ""}
                              onChange={(e) =>
                                setBankingForm((f) => ({
                                  ...f,
                                  contactEmail: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Contact Phone</Label>
                            <Input
                              type="tel"
                              placeholder="+27 11 xxx xxxx"
                              value={bankingForm.contactPhone || ""}
                              onChange={(e) =>
                                setBankingForm((f) => ({
                                  ...f,
                                  contactPhone: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button
                            variant="accent"
                            onClick={handleSaveBanking}
                            disabled={isSavingBanking}
                          >
                            {isSavingBanking ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Banking Details
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Charges Tab */}
            <TabsContent value="charges" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Receipt className="h-5 w-5" />
                          Recurring Charge Configuration
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Configure standard charges (levies, water,
                          electricity, etc.) that appear on tenant invoices.
                          <br />
                          <span className="font-medium">Fixed charges</span> are
                          automatically added to every invoice.
                          <span className="font-medium ml-1">
                            Optional charges
                          </span>{" "}
                          can be added manually per invoice.
                        </CardDescription>
                      </div>
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={openNewChargeDialog}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Charge
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCharges ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-accent" />
                      </div>
                    ) : chargeConfigs.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">
                          No charge configurations yet
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add recurring charges like levies, water, or
                          electricity that will appear on invoices.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={openNewChargeDialog}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Charge
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {chargeConfigs.map((charge) => (
                          <div
                            key={charge.id}
                            className={`flex items-center justify-between p-4 rounded-lg border ${
                              charge.isEnabled
                                ? "border-border"
                                : "border-border/50 opacity-60"
                            }`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div
                                className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                  charge.isFixed ? "bg-accent/10" : "bg-muted"
                                }`}
                              >
                                <DollarSign
                                  className={`h-5 w-5 ${charge.isFixed ? "text-accent" : "text-muted-foreground"}`}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium">{charge.name}</p>
                                  <Badge
                                    variant={
                                      charge.isFixed ? "default" : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {charge.isFixed ? "Fixed" : "Optional"}
                                  </Badge>
                                  {!charge.isEnabled && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs text-muted-foreground"
                                    >
                                      Disabled
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {charge.description || charge.chargeType}
                                </p>
                                {charge.taxRate > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Tax: {charge.taxRate}%
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <p className="font-semibold text-right">
                                R{charge.amount.toFixed(2)}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditChargeDialog(charge)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteCharge(charge.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>
                      Change your password to keep your account secure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm New Password
                      </Label>
                      <Input id="confirmPassword" type="password" />
                    </div>
                    <Button variant="accent">Update Password</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>
                      Add an extra layer of security to your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">
                            Two-Factor Authentication
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Secure your account with 2FA
                          </p>
                        </div>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>
                      Manage API keys for integrations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-4">
                        <Key className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium font-mono">
                            lf_live_**********************
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Created Dec 1, 2025
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        Revoke
                      </Button>
                    </div>
                    <Button variant="outline" className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Generate New Key
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Connected Services</CardTitle>
                    <CardDescription>
                      Manage your third-party integrations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        name: "Stripe",
                        description: "Payment processing",
                        connected: true,
                        icon: "💳",
                      },
                      {
                        name: "DocuSign",
                        description: "E-signature for leases",
                        connected: true,
                        icon: "✍️",
                      },
                      {
                        name: "Plaid",
                        description: "Bank verification",
                        connected: false,
                        icon: "🏦",
                      },
                      {
                        name: "Experian",
                        description: "Credit checks",
                        connected: true,
                        icon: "📊",
                      },
                      {
                        name: "SendGrid",
                        description: "Email notifications",
                        connected: true,
                        icon: "📧",
                      },
                      {
                        name: "Twilio",
                        description: "SMS notifications",
                        connected: false,
                        icon: "📱",
                      },
                    ].map((integration) => (
                      <div
                        key={integration.name}
                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xl">
                            {integration.icon}
                          </div>
                          <div>
                            <p className="font-medium">{integration.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {integration.description}
                            </p>
                          </div>
                        </div>
                        {integration.connected ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-success">
                              Connected
                            </span>
                            <Button variant="outline" size="sm">
                              Configure
                            </Button>
                          </div>
                        ) : (
                          <Button variant="accent" size="sm">
                            Connect
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
      {/* Charge Config Dialog */}
      <Dialog open={showChargeDialog} onOpenChange={setShowChargeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCharge ? "Edit Charge" : "Add Recurring Charge"}
            </DialogTitle>
            <DialogDescription>
              Configure a charge that will appear on tenant invoices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Charge Type *</Label>
                <Input
                  placeholder="e.g. levy, water, electricity"
                  value={chargeForm.chargeType}
                  onChange={(e) =>
                    setChargeForm((f) => ({
                      ...f,
                      chargeType: e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "_"),
                    }))
                  }
                  disabled={!!editingCharge}
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier (no spaces)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Display Name *</Label>
                <Input
                  placeholder="e.g. Monthly Levy"
                  value={chargeForm.name}
                  onChange={(e) =>
                    setChargeForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Optional description for this charge"
                value={chargeForm.description}
                onChange={(e) =>
                  setChargeForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (R) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={chargeForm.amount || ""}
                  onChange={(e) =>
                    setChargeForm((f) => ({
                      ...f,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  placeholder="0.00"
                  value={chargeForm.taxRate || ""}
                  onChange={(e) =>
                    setChargeForm((f) => ({
                      ...f,
                      taxRate: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">Fixed Charge</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically added to every invoice for this company
                  </p>
                </div>
                <Switch
                  checked={chargeForm.isFixed}
                  onCheckedChange={(v) =>
                    setChargeForm((f) => ({ ...f, isFixed: v }))
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">Enabled</p>
                  <p className="text-xs text-muted-foreground">
                    Active and available for invoicing
                  </p>
                </div>
                <Switch
                  checked={chargeForm.isEnabled}
                  onCheckedChange={(v) =>
                    setChargeForm((f) => ({ ...f, isEnabled: v }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowChargeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleSaveCharge}
              disabled={isSavingCharge}
            >
              {isSavingCharge ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editingCharge ? "Save Changes" : "Add Charge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
