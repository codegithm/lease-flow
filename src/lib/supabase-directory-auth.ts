import { buildAppUser, persistLegacyAuthSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function searchDbCompanies(query?: string, limit = 10) {
  let statement = supabase
    .from("companies")
    .select("id, name, country_code")
    .order("name", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 50)));

  if (query && query.trim()) {
    statement = statement.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await statement;
  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    countryCode: row.country_code,
  }));
}

export async function searchDbUsers(query?: string, companyId?: string) {
  let statement = supabase
    .from("profiles")
    .select("id, email, full_name, cell_number, company_id, status")
    .order("full_name", { ascending: true })
    .limit(25);

  if (query && query.trim()) {
    const q = query.trim();
    statement = statement.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  if (companyId) {
    statement = statement.eq("company_id", companyId);
  }

  const { data, error } = await statement;
  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    fullName: row.full_name || "",
    email: row.email || "",
    cellNumber: row.cell_number || "",
    phone: row.cell_number || "",
    companyId: row.company_id || "",
    status: row.status,
  }));
}

export async function signInWithSupabase(payload: {
  email: string;
  password: string;
}) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error) throw error;

  if (!data.session || !data.user) {
    throw new Error("Sign in failed. No active session returned.");
  }

  persistLegacyAuthSession(data.session);
  return buildAppUser(data.user, data.session.access_token);
}

export async function registerWithSupabase(payload: {
  email: string;
  password: string;
  fullName?: string;
  cellNumber?: string;
  companyId?: string;
  companyName?: string;
  companyLocation?: string;
  companyAddress?: string;
  countryCode?: string;
  role?: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        fullName: payload.fullName,
        name: payload.fullName,
        cellNumber: payload.cellNumber,
        companyId: payload.companyId,
        companyName: payload.companyName,
        companyLocation: payload.companyLocation,
        companyAddress: payload.companyAddress || payload.companyLocation,
        countryCode: payload.countryCode,
        role: payload.role || "tenant",
        status: "active",
      },
    },
  });

  if (error) throw error;

  if (data.session && data.user) {
    persistLegacyAuthSession(data.session);
    return buildAppUser(data.user, data.session.access_token);
  }

  return {
    message: "Registration successful. Please confirm email before signing in.",
    requiresEmailConfirmation: true,
  };
}
