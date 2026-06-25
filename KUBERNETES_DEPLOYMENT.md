# LeaseFlow Kubernetes Deployment Guide (Supabase Migration)

This repository no longer contains the legacy .NET Authentication/Application API services.

## What to deploy

- Frontend: `k8s/deployment.yaml`
- Supabase services are hosted in your Supabase project (not from this repo).

## Required external services

1. Supabase project (Auth, Postgres, Storage, Edge Functions)

## Edge Functions

Deploy and configure:

- `credit-check`
- `tenant-payment`

See `SUPABASE_EDGE_FUNCTIONS_SETUP.md` for CLI commands and secrets.

## Frontend env requirements

Use browser-safe values only:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_REDIRECT_URL`
- `VITE_ENVIRONMENT`

## Notes

- Old endpoints under `api/*` from .NET API services were decommissioned in this repository.
- Keep provider secrets (Paystack/Experian) in Supabase function secrets, never in frontend env files.


