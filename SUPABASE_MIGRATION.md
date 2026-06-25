# Supabase Migration Plan

This repository now uses Supabase as the frontend authentication provider in the React app.

## What is migrated now

- Sign in uses Supabase email/password auth.
- Sign up creates Supabase users and stores onboarding metadata in `user_metadata`.
- Session state is sourced from Supabase and bridged into the existing `localStorage` shape so the current app can keep running while the rest of the migration continues.
- Country configuration now lives in Supabase schema instead of frontend constants.
- Roles, permissions, profiles, companies, and user permission overrides now have a Supabase schema contract in `SUPABASE_SCHEMA.sql`.
- Units, estates, application links, applications, and application document metadata now have Supabase-backed frontend data access.
- Messaging, notifications, and maintenance request flows now use Supabase tables instead of legacy REST endpoints.
- Lease template/generation/send flows and additional-charge billing/appeal flows now use Supabase tables.
- Credit-check and payment initialization flows now run through Supabase Edge Functions (`credit-check` and `tenant-payment`).
- Employment statuses, document types, company lookup, and user search helpers now resolve from Supabase.

## Production setup required in Supabase

1. Create a Supabase project per environment.
2. Enable email confirmation for production.
3. Configure SMTP so auth emails are delivered from your domain.
4. Set the site URL and redirect URLs for local, staging, and production.
5. Move all secrets out of committed `appsettings.*.json` files and into your deployment platform secret store.
6. Apply `SUPABASE_SCHEMA.sql` so countries, roles, permissions, profiles, and companies exist in the database before using the migrated config screens.
7. Create database tables for full payment orchestration and reconciliation (processor events, receipts, settlements).
8. Enforce row level security on every multi-tenant table.
9. Replace custom document upload endpoints with Supabase Storage buckets and signed URLs.
10. Deploy the Edge Functions in `supabase/functions/` and configure function secrets (Paystack, Experian, provider toggles).
11. Keep webhook/settlement processing in Edge Functions or dedicated workers and reconcile every payment state transition.
12. Create Storage buckets: `documents`, `unit-images`, `estate-logos`, and `lease-pdfs` before testing upload flows.

## Recommended Supabase schema direction

- `profiles`: one row per auth user, includes role, company, country, status.
- `companies`: organization records.
- `company_memberships`: join table between users and companies.
- `units`, `applications`, `leases`, `payments`, `additional_charges`.
- `conversations`, `messages`, `notifications`, `maintenance_requests`.
- Storage buckets: `documents`, `unit-images`, `estate-logos`, `lease-pdfs`.

## Immediate next migration steps

1. Add a `profiles` table and a trigger that copies auth metadata into relational data.
2. Replace `src/lib/api.ts` auth- and profile-related functions with Supabase queries.
3. Add payment webhook and verification functions to complete processor reconciliation in Supabase.
4. Tighten broad RLS policies introduced for link/conversation/bootstrap phases to least-privilege policies.
5. Decommission .NET API services only after webhook/worker parity is complete and production traffic has no API dependency.


