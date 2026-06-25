# Supabase Edge Functions Setup (Production)

This project now includes production-oriented Supabase Edge Functions for credit checks and payment initialization.

## Functions included

- `credit-check`
- `tenant-payment`

Both functions are in `supabase/functions/` and are called by frontend billing APIs in `src/lib/supabase-billing-lease.ts`.

## Prerequisites

1. Install Supabase CLI.
2. Log in:
   - `supabase login`
3. Link this repository to your Supabase project:
   - `supabase link --project-ref <your-project-ref>`

## Deploy functions

From the `lease-flow` project root:

```bash
supabase functions deploy credit-check
supabase functions deploy tenant-payment
```

## Configure function secrets

Set these in each environment (dev/staging/prod):

Required runtime:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Credit-check provider:

- `CREDIT_CHECK_PROVIDER=mock`, `experian`, or `experian_sandbox`
- For Experian mode:
  - `EXPERIAN_API_URL`
  - `EXPERIAN_CHECK_ENDPOINT` (default `/v1/check`)
  - `EXPERIAN_API_KEY`
- For Experian sandbox mode:
  - `EXPERIAN_SANDBOX_API_URL`
  - `EXPERIAN_SANDBOX_CHECK_ENDPOINT` (default `/v1/check`)
  - `EXPERIAN_SANDBOX_API_KEY`

Payment provider:

- `PAYSTACK_SECRET_KEY`
- Optional:
  - `PAYSTACK_CURRENCY` (default `ZAR`)
  - `PAYSTACK_MODE` (`test` or `live`; if omitted it is inferred from key prefix)
  - `PAYSTACK_API_URL` (default `https://api.paystack.co`)

Example command:

```bash
supabase secrets set \
  CREDIT_CHECK_PROVIDER=experian \
  EXPERIAN_API_URL=https://api.experian.co.za \
  EXPERIAN_CHECK_ENDPOINT=/v1/check \
  EXPERIAN_API_KEY=your_experian_api_key \
  PAYSTACK_SECRET_KEY=sk_live_xxx \
  PAYSTACK_CURRENCY=ZAR
```

## Recommended testing environment

Use this for safe non-production testing:

```bash
supabase secrets set \
  CREDIT_CHECK_PROVIDER=mock \
  PAYSTACK_SECRET_KEY=sk_test_xxx \
  PAYSTACK_MODE=test \
  PAYSTACK_CURRENCY=ZAR
```

If you need provider sandbox testing instead of mock credit checks:

```bash
supabase secrets set \
  CREDIT_CHECK_PROVIDER=experian_sandbox \
  EXPERIAN_SANDBOX_API_URL=https://sandbox.your-experian-endpoint.com \
  EXPERIAN_SANDBOX_CHECK_ENDPOINT=/v1/check \
  EXPERIAN_SANDBOX_API_KEY=your_sandbox_key \
  PAYSTACK_SECRET_KEY=sk_test_xxx \
  PAYSTACK_MODE=test
```

## Local function testing

Serve functions locally:

```bash
supabase functions serve --no-verify-jwt
```

Invoke manually:

```bash
supabase functions invoke credit-check --body '{"applicationId":"<application-uuid>"}'
supabase functions invoke tenant-payment --body '{"amountInCents":10000,"paymentMethod":"card","additionalChargeIds":[],"callbackUrl":"https://yourdomain.com/payment/callback"}'
```

## Frontend environment variables

Frontend only needs browser-safe values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_REDIRECT_URL`

Do not place payment or credit-check secrets in frontend env files.

## Decommissioning legacy APIs

The frontend no longer depends on `VITE_AUTH_API_URL` or `VITE_APP_API_URL`.

Before shutting down old API services, complete these final parity checks:

1. Payment initialization works through `tenant-payment` in production.
2. Credit checks work through `credit-check` with your provider.
3. Payment webhook/verification pipeline is implemented and validated for retries and reconciliation.
4. Monitoring/alerts are active for function failures and provider errors.
