# Production Readiness Checklist

This checklist captures the minimum required steps to launch LeaseFlow safely on the current Supabase-based architecture.

## Codebase status

- Frontend auth, config, profiles, units, applications, leases, messaging, notifications, maintenance, additional charges, and reference data are routed through Supabase-backed modules.
- Legacy frontend API env variables are removed from `.env.example`, `src/vite-env.d.ts`, and the frontend Docker build.
- Preview-only lease-signing simulation paths are removed; lease signing now requires a real application context.

## Required launch steps (must complete)

1. Apply database schema

- Run `SUPABASE_SCHEMA.sql` in your production Supabase project.
- Verify all tables/triggers/policies are present.

2. Create required storage buckets

- `documents`
- `unit-images`
- `estate-logos`
- `lease-pdfs`

3. Configure frontend envs

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_REDIRECT_URL`
- Optional: `VITE_ENVIRONMENT=production`

4. Configure Supabase auth production settings

- Set site URL to production domain.
- Add exact redirect URLs used by sign-in/sign-up.
- Configure SMTP provider for transactional emails.
- Confirm email template branding and links.

5. Apply least-privilege review for RLS policies

- Validate policies table-by-table against real tenant isolation requirements.
- Verify no broad policy grants exceed intended role capabilities.

6. Deploy Supabase Edge Functions for billing and credit checks

- Deploy `supabase/functions/credit-check`.
- Deploy `supabase/functions/tenant-payment`.
- Configure function secrets (`PAYSTACK_SECRET_KEY`, `CREDIT_CHECK_PROVIDER`, `EXPERIAN_*`) in each environment.
- Validate function invocation permissions for tenant/agent roles.

7. End-to-end smoke tests (production-like environment)

- Sign up -> sign in -> dashboard access by role
- Create unit -> application link -> submit application
- Generate/send lease -> tenant sign flow
- Create and review additional charges
- Messaging and notifications roundtrip
- Maintenance creation and status updates

8. Observability and incident readiness

- Enable Supabase logs and alerts for auth/database errors.
- Add frontend error tracking (e.g., Sentry) if not already configured.
- Validate backup/restore policy in Supabase project.

## Strongly recommended before go-live

1. Add payment webhook and verification Edge Functions for end-to-end reconciliation (initialize -> webhook -> verify).
2. Remove any remaining demo or placeholder UI-only payment data from user-facing pages.
3. Run a security pass on storage object access and signed URL TTL settings.
4. Run load/smoke tests under expected concurrent user traffic.

## Go/No-Go

- Go only when all "Required launch steps" are complete and smoke tests pass without manual DB intervention.


