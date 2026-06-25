-- Catch-up migration for already-provisioned databases.
-- Safe to run multiple times.
-- Use this style for every schema change: create a new dated migration with IF NOT EXISTS / guards.

BEGIN;

-- 1) Link applications to tenant auth users (needed by tenant portal + invoice lookup)
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS tenant_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'applications_tenant_user_id_fkey'
      AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_tenant_user_id_fkey
      FOREIGN KEY (tenant_user_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS applications_tenant_user_id_idx
  ON public.applications(tenant_user_id);

-- Tenant can read only their own application rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'applications'
      AND policyname = 'tenant_can_read_own_application'
  ) THEN
    CREATE POLICY tenant_can_read_own_application
      ON public.applications
      FOR SELECT
      USING (tenant_user_id = auth.uid());
  END IF;
END $$;

-- 2) Optional company invoice/banking fields (used by invoice header/banking sections)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_holder text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_branch_code text,
  ADD COLUMN IF NOT EXISTS bank_branch_name text,
  ADD COLUMN IF NOT EXISTS invoice_prefix text;

COMMIT;
