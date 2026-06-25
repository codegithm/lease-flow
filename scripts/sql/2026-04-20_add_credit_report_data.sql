-- Add credit_report_data column to applications to store the full TransUnion report JSON
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS credit_report_data jsonb;
