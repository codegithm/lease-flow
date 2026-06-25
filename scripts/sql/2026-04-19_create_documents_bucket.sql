-- Patch: Ensure tenant document uploads have a valid storage bucket and policies.
-- Safe to run multiple times.

begin;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update
set public = excluded.public,
    name = excluded.name;

-- Allow anonymous and authenticated users to upload application documents.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'documents_insert_anon_auth'
  ) THEN
    CREATE POLICY documents_insert_anon_auth
    ON storage.objects
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'documents');
  END IF;
END;
$$;

-- Allow authenticated users to read documents (needed for signed URL generation).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'documents_select_authenticated'
  ) THEN
    CREATE POLICY documents_select_authenticated
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'documents');
  END IF;
END;
$$;

-- Allow authenticated users to update document objects in this bucket.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'documents_update_authenticated'
  ) THEN
    CREATE POLICY documents_update_authenticated
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'documents')
    WITH CHECK (bucket_id = 'documents');
  END IF;
END;
$$;

-- Allow authenticated users to delete document objects in this bucket.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'documents_delete_authenticated'
  ) THEN
    CREATE POLICY documents_delete_authenticated
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'documents');
  END IF;
END;
$$;

commit;
