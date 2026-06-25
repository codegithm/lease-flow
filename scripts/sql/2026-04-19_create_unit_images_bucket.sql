-- Patch: Ensure unit image uploads have a valid storage bucket and basic access policies.
-- Safe to run multiple times.

begin;

insert into storage.buckets (id, name, public)
values ('unit-images', 'unit-images', true)
on conflict (id) do update
set public = excluded.public,
    name = excluded.name;

-- Public read of unit images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'unit_images_public_read'
  ) THEN
    CREATE POLICY unit_images_public_read
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'unit-images');
  END IF;
END;
$$;

-- Authenticated users can upload unit images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'unit_images_auth_insert'
  ) THEN
    CREATE POLICY unit_images_auth_insert
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'unit-images');
  END IF;
END;
$$;

-- Authenticated users can update their uploaded objects in this bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'unit_images_auth_update'
  ) THEN
    CREATE POLICY unit_images_auth_update
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'unit-images')
    WITH CHECK (bucket_id = 'unit-images');
  END IF;
END;
$$;

-- Authenticated users can delete objects in this bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'unit_images_auth_delete'
  ) THEN
    CREATE POLICY unit_images_auth_delete
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'unit-images');
  END IF;
END;
$$;

commit;
