import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  },
);

export type SupabaseCountryRow = {
  code: string;
  name: string;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  is_supported: boolean;
};

export type SupabaseRoleRow = {
  id: number;
  name: string;
  description: string | null;
  can_create_company: boolean;
  can_manage_users: boolean;
  can_approve_accounts: boolean;
};

export type SupabaseCompanyRow = {
  id: string;
  name: string;
  address: string | null;
  country_code: string;
};

export type SupabaseProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  cell_number: string | null;
  role_id: number | null;
  role: string;
  company_id: string | null;
  status: string;
  approved_at: string | null;
  approved_by: string | null;
  companies?: SupabaseCompanyRow | null;
};

export type SupabasePermissionRow = {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
};

export type SupabaseUserPermissionRow = {
  id: number;
  user_id: string;
  permission_id: number;
  is_granted: boolean;
  granted_by_user_id: string;
  created_at: string;
  updated_at: string | null;
  permissions?: SupabasePermissionRow | null;
};
