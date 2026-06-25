import type { Session, User } from "@supabase/supabase-js";

const LEGACY_USER_KEY = "user";
const LEGACY_TOKEN_KEY = "token";
const LEGACY_SESSION_EXPIRY_KEY = "sessionExpiry";

type Metadata = Record<string, unknown>;

export interface AppUser {
  id: string;
  email: string | null;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  cellNumber?: string;
  companyName?: string;
  companyId?: string;
  countryCode?: string;
  role: string;
  status: string;
  token?: string;
  agentId?: string;
  tenantUserId?: string;
  emailConfirmed: boolean;
}

function getString(metadata: Metadata, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function getEmailName(email?: string | null) {
  if (!email) {
    return "User";
  }

  return email.split("@")[0] || "User";
}

export function buildAppUser(user: User, accessToken?: string): AppUser {
  const metadata: Metadata = {
    ...(user.app_metadata || {}),
    ...(user.user_metadata || {}),
  };

  const firstName = getString(metadata, "firstName", "first_name");
  const lastName = getString(metadata, "lastName", "last_name");
  const fullName =
    getString(metadata, "fullName", "full_name", "name") ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    getEmailName(user.email);
  const role = (getString(metadata, "role") || "tenant").toLowerCase();
  const status = (getString(metadata, "status") || "active").toLowerCase();
  const phone = getString(metadata, "phone", "cellNumber", "cell_number");

  return {
    id: user.id,
    email: user.email ?? null,
    fullName,
    firstName,
    lastName,
    phone,
    cellNumber: phone,
    companyName: getString(metadata, "companyName", "company_name"),
    companyId: getString(metadata, "companyId", "company_id"),
    countryCode: getString(metadata, "countryCode", "country_code"),
    role,
    status,
    token: accessToken,
    agentId:
      getString(metadata, "agentId", "agent_id") ||
      (role === "tenant" ? undefined : user.id),
    tenantUserId:
      getString(metadata, "tenantUserId", "tenant_user_id") ||
      (role === "tenant" ? user.id : undefined),
    emailConfirmed: Boolean(user.email_confirmed_at),
  };
}

export function clearLegacyAuthStorage() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(LEGACY_USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_SESSION_EXPIRY_KEY);
}

export function persistLegacyAuthSession(session: Session | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session?.user) {
    clearLegacyAuthStorage();
    return;
  }

  const appUser = buildAppUser(session.user, session.access_token);
  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(appUser));
  localStorage.setItem(LEGACY_TOKEN_KEY, session.access_token);

  if (session.expires_at) {
    localStorage.setItem(
      LEGACY_SESSION_EXPIRY_KEY,
      String(session.expires_at * 1000),
    );
  }
}
