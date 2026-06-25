import { buildAppUser } from "@/lib/auth";
import {
  supabase,
  type SupabaseCompanyRow,
  type SupabaseCountryRow,
  type SupabasePermissionRow,
  type SupabaseProfileRow,
  type SupabaseRoleRow,
  type SupabaseUserPermissionRow,
} from "@/lib/supabase";

export interface CountryRecord {
  code: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
  isSupported?: boolean;
}

export interface RoleRecord {
  id: number;
  name: string;
  description: string | null;
  canCreateCompany: boolean;
  canManageUsers: boolean;
  canApproveAccounts: boolean;
}

export interface PermissionRecord {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
}

export interface ProfileRecord {
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
}

export interface PermissionOverrideRecord {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  isGranted: boolean;
  grantedAt: string;
  grantedBy: string;
}

type ProfileWithCompanyRow = Omit<SupabaseProfileRow, "companies"> & {
  companies?: SupabaseCompanyRow[] | SupabaseCompanyRow | null;
};

function mapCountry(row: SupabaseCountryRow): CountryRecord {
  return {
    code: row.code,
    name: row.name,
    currencyCode: row.currency_code,
    currencySymbol: row.currency_symbol,
    currencyName: row.currency_name,
    isSupported: row.is_supported,
  };
}

function mapRole(row: SupabaseRoleRow): RoleRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    canCreateCompany: row.can_create_company,
    canManageUsers: row.can_manage_users,
    canApproveAccounts: row.can_approve_accounts,
  };
}

function mapPermission(row: SupabasePermissionRow): PermissionRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    category: row.category,
  };
}

function fallbackProfileFromSession() {
  const raw = localStorage.getItem("user");
  if (raw) {
    return JSON.parse(raw) as ProfileRecord;
  }

  return null;
}

function mapProfile(
  profile: SupabaseProfileRow,
  company?: SupabaseCompanyRow | null,
): ProfileRecord {
  return {
    id: profile.id,
    email: profile.email || "",
    fullName: profile.full_name || "",
    cellNumber: profile.cell_number || "",
    role: profile.role,
    roleId: profile.role_id || 0,
    companyId: profile.company_id || "",
    companyName: company?.name,
    companyAddress: company?.address || undefined,
    status: profile.status,
  };
}

export async function getDbSupportedCountries() {
  const { data, error } = await supabase
    .from("countries")
    .select(
      "code, name, currency_code, currency_symbol, currency_name, is_supported",
    )
    .eq("is_supported", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => mapCountry(row as SupabaseCountryRow));
}

export async function getDbCountry(code: string) {
  const { data, error } = await supabase
    .from("countries")
    .select(
      "code, name, currency_code, currency_symbol, currency_name, is_supported",
    )
    .eq("code", code.toUpperCase())
    .single();

  if (error) {
    throw error;
  }

  return mapCountry(data as SupabaseCountryRow);
}

export async function getDbCurrentUser() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    const fallback = fallbackProfileFromSession();
    if (!fallback) {
      throw new Error("No authenticated user found.");
    }
    return fallback;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, cell_number, role_id, role, company_id, status, approved_at, approved_by, companies(id, name, address, country_code)",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return buildAppUser(user) as unknown as ProfileRecord;
  }

  const typed = data as unknown as ProfileWithCompanyRow;
  const company = Array.isArray(typed.companies)
    ? typed.companies[0] || null
    : typed.companies || null;

  return mapProfile(typed as SupabaseProfileRow, company);
}

export async function getDbRoles() {
  const { data, error } = await supabase
    .from("roles")
    .select(
      "id, name, description, can_create_company, can_manage_users, can_approve_accounts",
    )
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => mapRole(row as SupabaseRoleRow));
}

export async function getDbCompanyUsers(companyId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, role_id, status, company_id")
    .eq("company_id", companyId)
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    email: row.email || "",
    fullName: row.full_name || "",
    role: row.role,
    roleId: row.role_id || 0,
    status: row.status,
    companyId: row.company_id || "",
  }));
}

export async function updateDbCurrentUser(payload: {
  fullName?: string;
  cellNumber?: string;
}) {
  const currentUser = await getDbCurrentUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: payload.fullName,
      cell_number: payload.cellNumber,
    })
    .eq("id", currentUser.id);

  if (error) {
    throw error;
  }

  return true;
}

export async function updateDbCompany(
  companyId: string,
  payload: { name?: string; address?: string },
) {
  const { error } = await supabase
    .from("companies")
    .update({
      name: payload.name,
      address: payload.address,
    })
    .eq("id", companyId);

  if (error) {
    throw error;
  }

  return true;
}

export async function updateDbUserRole(userId: string, newRole: string) {
  const { data: roleRow, error: roleError } = await supabase
    .from("roles")
    .select("id, name")
    .eq("name", newRole)
    .single();

  if (roleError) {
    throw roleError;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: roleRow.name, role_id: roleRow.id })
    .eq("id", userId);

  if (error) {
    throw error;
  }

  return true;
}

export async function updateDbUserStatus(userId: string, status: string) {
  const patch: Record<string, unknown> = {
    status,
  };

  if (status === "active") {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = (await supabase.auth.getUser()).data.user?.id || null;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId);

  if (error) {
    throw error;
  }

  return true;
}

export async function getDbPermissions() {
  const { data, error } = await supabase
    .from("permissions")
    .select("id, code, name, description, category")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => mapPermission(row as SupabasePermissionRow));
}

export async function getDbUserPermissionOverrides(userId: string) {
  const { data, error } = await supabase
    .from("user_permissions")
    .select(
      "permission_id, is_granted, granted_by_user_id, created_at, permissions(id, code, name, description, category)",
    )
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data || []).map((row) => {
    const typed = row as unknown as SupabaseUserPermissionRow;
    return {
      permissionId: typed.permission_id,
      permissionCode: typed.permissions?.code || "",
      permissionName: typed.permissions?.name || "",
      isGranted: typed.is_granted,
      grantedAt: typed.created_at,
      grantedBy: typed.granted_by_user_id,
    } as PermissionOverrideRecord;
  });
}

export async function getDbEffectivePermissions(userId: string) {
  const [profile, overrides] = await Promise.all([
    supabase.from("profiles").select("role_id").eq("id", userId).single(),
    getDbUserPermissionOverrides(userId),
  ]);

  if (profile.error) {
    throw profile.error;
  }

  const roleId = profile.data.role_id;
  const result: Record<string, boolean> = {};

  if (roleId) {
    const { data: roleDefaults, error: roleError } = await supabase
      .from("role_permissions")
      .select("is_granted, permissions(code)")
      .eq("role_id", roleId);

    if (roleError) {
      throw roleError;
    }

    for (const entry of roleDefaults || []) {
      const permissionCode = (
        entry as { permissions?: { code?: string } | null }
      ).permissions?.code;
      if (permissionCode) {
        result[permissionCode] = Boolean(
          (entry as { is_granted: boolean }).is_granted,
        );
      }
    }
  }

  for (const override of overrides) {
    result[override.permissionCode] = override.isGranted;
  }

  return result;
}

export async function setDbUserPermission(
  userId: string,
  permissionId: number,
  isGranted: boolean,
) {
  const grantedBy = (await supabase.auth.getUser()).data.user?.id;
  if (!grantedBy) {
    throw new Error("No authenticated user available to grant permissions.");
  }

  const { error } = await supabase.from("user_permissions").upsert(
    {
      user_id: userId,
      permission_id: permissionId,
      is_granted: isGranted,
      granted_by_user_id: grantedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,permission_id" },
  );

  if (error) {
    throw error;
  }

  return true;
}

export async function removeDbUserPermission(
  userId: string,
  permissionId: number,
) {
  const { error } = await supabase
    .from("user_permissions")
    .delete()
    .eq("user_id", userId)
    .eq("permission_id", permissionId);

  if (error) {
    throw error;
  }

  return true;
}

export async function bulkUpdateDbUserPermissions(
  userId: string,
  permissions: Array<{
    permissionId: number;
    isGranted: boolean;
    remove?: boolean;
  }>,
) {
  for (const permission of permissions) {
    if (permission.remove) {
      await removeDbUserPermission(userId, permission.permissionId);
    } else {
      await setDbUserPermission(
        userId,
        permission.permissionId,
        permission.isGranted,
      );
    }
  }

  return true;
}

export async function getDbCompanyCurrency(companyId: string) {
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("country_code")
    .eq("id", companyId)
    .single();

  if (companyError) {
    throw companyError;
  }

  const country = await getDbCountry(company.country_code);

  return {
    countryCode: company.country_code,
    currencyCode: country.currencyCode,
    currencySymbol: country.currencySymbol,
    currencyName: country.currencyName,
  };
}

// ── Banking Details ───────────────────────────────────────────────────────────

export interface BankingDetailsRecord {
  id?: string;
  companyId: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branchCode?: string;
  branchName?: string;
  accountType: string;
  swiftCode?: string;
  vatNumber?: string;
  registrationNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
}

function mapBankingDetails(row: any): BankingDetailsRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    bankName: row.bank_name,
    accountHolder: row.account_holder,
    accountNumber: row.account_number,
    branchCode: row.branch_code || undefined,
    branchName: row.branch_name || undefined,
    accountType: row.account_type || "Current",
    swiftCode: row.swift_code || undefined,
    vatNumber: row.vat_number || undefined,
    registrationNumber: row.registration_number || undefined,
    contactEmail: row.contact_email || undefined,
    contactPhone: row.contact_phone || undefined,
  };
}

export async function getDbCompanyBankingDetails(
  companyId: string,
): Promise<BankingDetailsRecord | null> {
  const { data, error } = await supabase
    .from("company_banking_details")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapBankingDetails(data) : null;
}

export async function saveDbCompanyBankingDetails(
  companyId: string,
  details: Omit<BankingDetailsRecord, "id" | "companyId">,
): Promise<BankingDetailsRecord> {
  const payload = {
    company_id: companyId,
    bank_name: details.bankName,
    account_holder: details.accountHolder,
    account_number: details.accountNumber,
    branch_code: details.branchCode || null,
    branch_name: details.branchName || null,
    account_type: details.accountType || "Current",
    swift_code: details.swiftCode || null,
    vat_number: details.vatNumber || null,
    registration_number: details.registrationNumber || null,
    contact_email: details.contactEmail || null,
    contact_phone: details.contactPhone || null,
  };

  const { data, error } = await supabase
    .from("company_banking_details")
    .upsert(payload, { onConflict: "company_id" })
    .select("*")
    .single();

  if (error) {
    // Provide a clear message for the unique account_number constraint
    if (error.code === "23505" && error.message?.includes("account_number")) {
      throw new Error(
        "This bank account number is already registered to another company. Each company must use a unique bank account.",
      );
    }
    throw error;
  }

  return mapBankingDetails(data);
}

// ── Charge Configurations ─────────────────────────────────────────────────────

export interface ChargeConfigRecord {
  id: string;
  companyId: string;
  chargeType: string;
  name: string;
  description?: string;
  amount: number;
  isEnabled: boolean;
  isFixed: boolean;
  taxRate: number;
  displayOrder: number;
}

function mapChargeConfig(row: any): ChargeConfigRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    chargeType: row.charge_type,
    name: row.name,
    description: row.description || undefined,
    amount: Number(row.amount || 0),
    isEnabled: Boolean(row.is_enabled),
    isFixed: Boolean(row.is_fixed),
    taxRate: Number(row.tax_rate || 0),
    displayOrder: Number(row.display_order || 0),
  };
}

export async function getDbCompanyChargeConfigs(
  companyId: string,
): Promise<ChargeConfigRecord[]> {
  const { data, error } = await supabase
    .from("company_charge_configs")
    .select("*")
    .eq("company_id", companyId)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapChargeConfig);
}

export async function saveDbCompanyChargeConfig(
  companyId: string,
  config: Omit<ChargeConfigRecord, "id" | "companyId">,
): Promise<ChargeConfigRecord> {
  const payload = {
    company_id: companyId,
    charge_type: config.chargeType,
    name: config.name,
    description: config.description || null,
    amount: config.amount,
    is_enabled: config.isEnabled,
    is_fixed: config.isFixed,
    tax_rate: config.taxRate,
    display_order: config.displayOrder,
  };

  const { data, error } = await supabase
    .from("company_charge_configs")
    .upsert(payload, { onConflict: "company_id,charge_type" })
    .select("*")
    .single();

  if (error) throw error;
  return mapChargeConfig(data);
}

export async function deleteDbCompanyChargeConfig(id: string): Promise<void> {
  const { error } = await supabase
    .from("company_charge_configs")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ── User Invitations ──────────────────────────────────────────────────────────

export interface UserInvitationRecord {
  id: string;
  companyId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export async function createDbUserInvitation(
  companyId: string,
  email: string,
  role: string,
  invitedByUserId: string,
): Promise<UserInvitationRecord> {
  // Upsert: if the same email+company already has a pending invite, refresh it
  const { data, error } = await supabase
    .from("user_invitations")
    .upsert(
      {
        company_id: companyId,
        email: email.toLowerCase().trim(),
        role,
        invited_by_user_id: invitedByUserId,
        status: "pending",
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      { onConflict: "company_id,email" },
    )
    .select("*")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    companyId: data.company_id,
    email: data.email,
    role: data.role,
    status: data.status,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  };
}

export async function getDbUserInvitations(
  companyId: string,
): Promise<UserInvitationRecord[]> {
  const { data, error } = await supabase
    .from("user_invitations")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    email: row.email,
    role: row.role,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

export async function cancelDbUserInvitation(id: string): Promise<void> {
  const { error } = await supabase
    .from("user_invitations")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) throw error;
}
