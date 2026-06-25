-- Add tenant_user_id to applications so tenants can be looked up by their auth user ID.
-- Safe to run multiple times (IF NOT EXISTS / IF COL_LENGTH).

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS tenant_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Index for fast lookups by tenant user
CREATE INDEX IF NOT EXISTS applications_tenant_user_id_idx
  ON public.applications (tenant_user_id);

-- Allow tenants to read their own application via tenant_user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
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
