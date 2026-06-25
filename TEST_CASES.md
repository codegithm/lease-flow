# LeaseFlow – Test Cases

**Application:** LeaseFlow Property Management Platform  
**Stack:** React 18 + TypeScript · Supabase (Auth, PostgreSQL, Storage, Edge Functions) · Paystack · TransUnion SA  
**Updated:** June 2026

---

## Table of Contents

1. [Auth & Account Management](#1-auth--account-management)
2. [Estate & Unit Management](#2-estate--unit-management)
3. [Tenant Application Flow](#3-tenant-application-flow)
4. [Credit Check](#4-credit-check)
5. [Lease Management & Digital Signing](#5-lease-management--digital-signing)
6. [Payments (Admin View)](#6-payments-admin-view)
7. [Tenant Portal](#7-tenant-portal)
8. [Tax Invoice & Statement](#8-tax-invoice--statement)
9. [Additional Charges](#9-additional-charges)
10. [Messaging & Notifications](#10-messaging--notifications)
11. [Team / Company Users](#11-team--company-users)
12. [Settings & Configurations](#12-settings--configurations)
13. [Security & Edge Cases](#13-security--edge-cases)
14. [Infrastructure & Deployment](#14-infrastructure--deployment)

---

## 1. Auth & Account Management

### TC-AUTH-001 — Property Owner Sign-Up (Happy Path)

**Preconditions:** Valid email not yet registered  
**Steps:**

1. Navigate to `/signup`
2. Enter business name, full name, email, password (≥ 8 chars), confirm password
3. Accept Terms & Conditions
4. Click **Sign Up**

**Expected:**

- Toast: "Account created successfully"
- Redirect to `/signup/verify-email`
- Supabase sends confirmation email to entered address

---

### TC-AUTH-002 — Email Verification

**Preconditions:** TC-AUTH-001 completed  
**Steps:**

1. Open verification email → click confirmation link
2. Browser redirects to `/signin`

**Expected:**

- Supabase marks `email_confirmed_at` on the user
- No error on redirect
- User can now sign in

---

### TC-AUTH-003 — Sign In (Happy Path)

**Preconditions:** Verified account from TC-AUTH-002  
**Steps:**

1. Navigate to `/signin`
2. Enter registered email and correct password
3. Click **Sign In**

**Expected:**

- Toast: "Welcome back!"
- Redirect to `/dashboard`
- Session cookie / JWT set in browser

---

### TC-AUTH-004 — Sign In with Wrong Password

**Steps:**

1. Navigate to `/signin`
2. Enter valid email, wrong password
3. Click **Sign In**

**Expected:**

- Toast error: "Invalid credentials" (or Supabase auth error message)
- User remains on `/signin`
- No session created

---

### TC-AUTH-005 — Sign In with Unverified Email

**Preconditions:** User registered but did NOT click verification link  
**Expected:**

- Error toast referencing email verification
- No session created

---

### TC-AUTH-006 — Password Reset Flow

**Steps:**

1. On `/signin` click **Forgot Password**
2. Enter registered email → submit
3. Open reset email → click link
4. Enter new password (≥ 8 chars) → confirm

**Expected:**

- Reset email sent within 60 seconds
- After reset, user can sign in with new password
- Old password no longer works

---

### TC-AUTH-007 — Protected Route Redirect

**Preconditions:** Not signed in  
**Steps:**

1. Navigate directly to `/dashboard`

**Expected:**

- Redirect to `/signin`
- After signing in, user is redirected back to `/dashboard`

---

### TC-AUTH-008 — Sign Out

**Preconditions:** Signed in  
**Steps:**

1. Click user avatar → **Sign Out**

**Expected:**

- Session cleared (JWT removed)
- Redirect to `/`
- Subsequent navigation to protected routes redirects to `/signin`

---

## 2. Estate & Unit Management

### TC-UNIT-001 — Create Unit (Happy Path)

**Preconditions:** Signed in as Owner or Agent with create permission  
**Steps:**

1. Navigate to `/units` → click **Add Unit**
2. Fill in: Unit Name, Estate Name, Address, Rent, Deposit, Bedrooms, Bathrooms
3. Upload at least one photo
4. Click **Save**

**Expected:**

- Unit appears in `/units` list
- Unit detail page `/units/:id` shows all entered data
- Photo stored in `unit-images` Supabase Storage bucket

---

### TC-UNIT-002 — Edit Unit

**Preconditions:** Unit exists (TC-UNIT-001)  
**Steps:**

1. Navigate to `/units/:id` → click **Edit**
2. Change rent amount
3. Save

**Expected:**

- Updated rent reflected immediately on unit detail and units list
- No phantom data from previous values

---

### TC-UNIT-003 — Unit Availability Status

**Expected:**

- New units show status **Available**
- After application is approved and lease active: status **Occupied**
- After lease ends: status reverts to **Available**

---

### TC-UNIT-004 — Upload Unit Photos

**Steps:**

1. On Edit Unit page, upload a PNG/JPG file < 5 MB

**Expected:**

- Photo preview appears
- File stored in `unit-images` bucket with path `{companyId}/{unitId}/{filename}`
- Photo visible on unit detail page

---

## 3. Tenant Application Flow

### TC-APP-001 — Generate Application Link

**Preconditions:** Unit exists  
**Steps:**

1. Navigate to `/units/:id`
2. Click **Generate Application Link**

**Expected:**

- Unique URL (containing `applicationLinkId`) displayed and copyable
- Link targets `/apply?link={id}`

---

### TC-APP-002 — Tenant Self-Registration via Application Link

**Preconditions:** Application link generated (TC-APP-001)  
**Steps:**

1. Open application link in browser (can be a different browser / incognito)
2. Fill in: Full Name, ID Number, Email, Cell Number, Salary, Employer
3. Upload ID document (PDF or image)
4. Accept Terms & Conditions
5. Submit application

**Expected:**

- Supabase Auth account created for tenant
- Verification email sent to tenant
- Application record created in `applications` table with `status = 'submitted'`
- `tenant_user_id` set on the application after auth account creation
- Application appears in admin `/applications` list

---

### TC-APP-003 — Duplicate Application (Same Tenant, Same Unit)

**Steps:**

1. Attempt to submit a second application via the same link with the same email

**Expected:**

- Error or graceful message: "An application already exists for this unit"
- No duplicate application created

---

### TC-APP-004 — Admin Reviews Application

**Preconditions:** TC-APP-002 completed  
**Steps:**

1. Admin navigates to `/applications`
2. Clicks on the new application

**Expected:**

- Full application detail displayed: tenant name, ID, salary, employer, uploaded documents
- Status shows **Submitted**
- Action buttons available: **Approve**, **Reject**, **Request Credit Check**

---

### TC-APP-005 — Reject Application

**Steps:**

1. On application detail, click **Reject**
2. (If prompted) enter reason

**Expected:**

- Application status changes to **Rejected**
- Tenant receives notification/email (if notifications configured)

---

### TC-APP-006 — Document Download

**Preconditions:** Tenant uploaded ID document  
**Steps:**

1. On application detail, click document name

**Expected:**

- File downloaded from `documents` Supabase Storage bucket (signed URL)
- File opens correctly

---

## 4. Credit Check

### TC-CC-001 — Request Credit Check (Mock Mode)

**Preconditions:** `CREDIT_CHECK_PROVIDER` secret = `mock`  
**Steps:**

1. On application detail, click **Request Credit Check**

**Expected:**

- Loading spinner while edge function executes
- Credit score displayed (deterministic value 550–830 based on application ID)
- Score breakdown visible on `/applications/:id/credit-report`
- Application status updated to reflect credit check completed

---

### TC-CC-002 — Credit Check Report Page

**Steps:**

1. Navigate to `/applications/:id/credit-report`

**Expected:**

- Risk level badge (Low / Medium / High) based on score threshold
- Score visualisation (gauge or progress bar)
- Recommendation section (Approve / Conditional / Decline)
- Printable layout

---

### TC-CC-003 — Credit Check (TransUnion Live Mode)

**Preconditions:** `CREDIT_CHECK_PROVIDER=transunion` secret set, valid `TRANSUNION_*` secrets  
**Steps:**

1. Request credit check on an application with a real SA ID number

**Expected:**

- Edge function calls TransUnion API
- Real credit score returned and stored in `applications.credit_report_data`
- Same report page renders with live data

---

## 5. Lease Management & Digital Signing

### TC-LEASE-001 — Generate Lease PDF

**Preconditions:** Application status is **Approved** or ready for lease generation  
**Steps:**

1. On application detail, click **Generate Lease**
2. Confirm lease period and start date

**Expected:**

- Lease PDF generated (stored in `documents` bucket)
- Link to download/preview lease available
- Application status moves to **Lease Sent** or equivalent

---

### TC-LEASE-002 — Tenant Digital Signing

**Preconditions:** Lease generated (TC-LEASE-001), tenant has active account  
**Steps:**

1. Tenant navigates to `/lease-signing/:id`
2. Reviews lease content
3. Clicks **Sign Lease** / types name as signature

**Expected:**

- `signed_lease_path` set on the application
- Application status moves to **Lease Signed**
- Timestamp and IP recorded (if implemented)
- Admin notified

---

### TC-LEASE-003 — Leases Admin View

**Steps:**

1. Navigate to `/leases`

**Expected:**

- All active leases listed with: tenant name, unit, start date, end date (computed from start + duration months), status
- Filterable by status
- Expiring leases highlighted (≤ 30 days remaining)

---

## 6. Payments (Admin View)

### TC-PAY-001 — View All Payments

**Preconditions:** At least one payment record in `tenant_payments`  
**Steps:**

1. Navigate to `/payments`

**Expected:**

- Payment records loaded from database (not mock data)
- Columns: Tenant Name, Reference, Amount, Payment Method, Status, Date
- Summary cards show: Total Collected (paid), Pending, Failed counts

---

### TC-PAY-002 — Filter Payments by Status

**Steps:**

1. On `/payments`, select **Paid** from status filter

**Expected:**

- Only payments with `status = 'paid'` shown
- Summary stats update to reflect filtered set

---

### TC-PAY-003 — Search Payments

**Steps:**

1. Type tenant name in search box

**Expected:**

- Table filters in real-time to show matching tenant name or reference

---

### TC-PAY-004 — View Invoice from Payment (Admin)

**Preconditions:** Payment with status `paid` exists  
**Steps:**

1. Click the `⋮` action menu on a paid payment row
2. Click **View Invoice / Statement**

**Expected:**

- Navigates to `/invoice/:applicationId?month=YYYY-MM`
- Invoice page shows correct tenant, unit, charges, and payment amount

---

### TC-PAY-005 — Copy Payment Reference

**Steps:**

1. Click `⋮` → **Copy Reference**

**Expected:**

- Toast: "Reference copied"
- Clipboard contains the payment reference string

---

## 7. Tenant Portal

### TC-TP-001 — Access Tenant Portal

**Preconditions:** Tenant has verified account; `tenant_user_id` set on their application  
**Steps:**

1. Tenant signs in → navigates to `/tenant-portal/:tenantUserId`

**Expected:**

- Portal loads with: monthly rent, lease end date, balance due, payment history
- Correct unit name and estate shown

---

### TC-TP-002 — Lease End Date Display

**Expected:**

- Lease end date computed correctly as `leaseStartDate + leaseDurationMonths`
- E.g., Start: 2025-01-01, Duration: 12 months → End: 2026-01-01
- Displayed in human-readable format ("January 2026")

---

### TC-TP-003 — Make Monthly Rent Payment (Paystack Live)

**Preconditions:** `PAYSTACK_SECRET_KEY=sk_live_xxx` set in Supabase secrets  
**Steps:**

1. On tenant portal, click **Pay Rent** or **Pay Now**
2. Confirm amount

**Expected:**

- Edge function `tenant-payment` called with `amountInCents`
- Paystack `authorization_url` returned
- Browser redirects to Paystack payment page
- After payment, Paystack webhook updates `tenant_payments.status` to `paid`
- Portal payment history refreshes

---

### TC-TP-004 — Make Payment (Mock Mode)

**Preconditions:** `PAYSTACK_SECRET_KEY` NOT set (or empty)  
**Steps:**

1. Click **Pay Rent** on tenant portal

**Expected:**

- `mockMode: true` returned by edge function
- Toast or info: "Mock payment mode active"
- `tenant_payments` record created with `status = 'initialized'`
- No Paystack redirect (or mock redirect URL shown)

---

### TC-TP-005 — View Additional Charges / Fines

**Preconditions:** Admin has created additional charges against this tenant's application  
**Expected:**

- Charges listed under "Outstanding Charges" or "Fines" tab
- Each shows: type, amount, due date, status (pending/paid/overdue)

---

### TC-TP-006 — View Communications / Messages

**Expected:**

- All conversations between tenant and property manager listed
- Unread badge shown for unread messages
- Clicking a conversation opens message thread

---

### TC-TP-007 — View Monthly Invoice

**Steps:**

1. On tenant portal lease tab, click **View Monthly Invoice & Statement**

**Expected:**

- Navigates to `/invoice/:applicationId` (no `?month` = current month)
- Invoice renders with correct data

---

## 8. Tax Invoice & Statement

### TC-INV-001 — Invoice Page Renders

**Preconditions:** Application exists with a unit and lease  
**Steps:**

1. Navigate to `/invoice/:applicationId`

**Expected:**

- Invoice renders without errors
- Shows: company name, tenant name, property, unit, statement date, billing month
- "Tax Invoice & Statement" heading visible

---

### TC-INV-002 — Line Items

**Expected:**

- **Balance B/f**: sum of prior-month unpaid `additional_charges` (or 0)
- **Rent: Residential**: unit rent amount
- **Additional Charges**: each charge from `additional_charges` for the billing month
- **Receipts**: paid `tenant_payments` for the month shown as credits (negative)

---

### TC-INV-003 — Totals

**Expected:**

- **Arrears/Prepaid**: equals Balance B/f
- **Current Month Charges**: rent + this month's additional charges
- **Amount Due**: `openingBalance + currentMonthCharges - paymentsThisMonth`

---

### TC-INV-004 — Aging Grid

**Expected:**

- Five buckets shown: 120 Days+ | 90 Days | 60 Days | 30 Days | Current
- 30 Days bucket = opening balance (arrears)
- Current bucket = current month charges

---

### TC-INV-005 — Print / Save as PDF

**Steps:**

1. Click **Print** or **Save as PDF** toolbar button

**Expected:**

- Browser print dialog opens
- Toolbar (`no-print` class) hidden in print view
- Invoice renders cleanly on A4 (210mm × 297mm)

---

### TC-INV-006 — Billing Month Override

**Steps:**

1. Navigate to `/invoice/:applicationId?month=2026-03`

**Expected:**

- Invoice header shows "For the Month: March 2026"
- Line items filtered to March 2026 data

---

## 9. Additional Charges

### TC-CHRG-001 — Create Additional Charge (Admin)

**Preconditions:** Application exists  
**Steps:**

1. On application detail or unit page, create additional charge
2. Enter: charge type (e.g., Electricity, Water, Fine), amount, billing month, description

**Expected:**

- Charge record created in `additional_charges` table
- Charge visible in tenant portal and invoice

---

### TC-CHRG-002 — Mark Charge as Paid

**Steps:**

1. Admin marks charge as paid

**Expected:**

- `status` updated to `paid`
- Charge no longer appears in "outstanding" section
- Excluded from Amount Due calculation

---

## 10. Messaging & Notifications

### TC-MSG-001 — Send Message (Admin to Tenant)

**Steps:**

1. Navigate to `/messages`
2. Select or start conversation with tenant
3. Type message → send

**Expected:**

- Message appears in conversation thread
- Tenant can view reply on their portal

---

### TC-MSG-002 — Send Message (Tenant to Admin)

**Steps:**

1. On tenant portal Messages tab, type and send message

**Expected:**

- Message visible to admin in `/messages`
- Unread indicator shown to admin

---

### TC-NOTIF-001 — Notification Bell

**Steps:**

1. Navigate to `/notifications`

**Expected:**

- System notifications listed (application submitted, lease signed, payment received, etc.)
- Unread count badge on nav link updates

---

## 11. Team / Company Users

### TC-TEAM-001 — Invite Team Member

**Preconditions:** Signed in as Owner  
**Steps:**

1. Navigate to `/team`
2. Enter email and select role (Agent, Viewer, etc.)
3. Click **Invite**

**Expected:**

- Invitation email sent
- Pending invitation shown in team list

---

### TC-TEAM-002 — Change User Role

**Steps:**

1. Navigate to `/team`
2. Change a member's role from Agent → Viewer

**Expected:**

- Role updated immediately
- Member's permissions change accordingly (e.g., loses create/edit access)

---

### TC-TEAM-003 — Remove Team Member

**Steps:**

1. On `/team`, click remove on a member

**Expected:**

- Member removed from company
- Their sessions invalidated (or flagged for reauth)
- They can no longer access protected admin routes

---

## 12. Settings & Configurations

### TC-SETTINGS-001 — Update Company Name

**Steps:**

1. Navigate to `/settings`
2. Change company name → save

**Expected:**

- Company name updated in `companies` table
- New name reflected in invoice header and nav

---

### TC-SETTINGS-002 — Update Company Address

**Expected:**

- Address saved and used on invoice entity section

---

### TC-CONFIG-001 — Lease Template Configuration

**Steps:**

1. Navigate to `/configurations`
2. Edit lease template fields (clauses, header, etc.)

**Expected:**

- Template saved
- Next generated lease PDF uses updated template

---

## 13. Security & Edge Cases

### TC-SEC-001 — RLS: Tenant Cannot See Other Tenants' Payments

**Steps:**

1. Sign in as Tenant A
2. Attempt to query `tenant_payments` directly (e.g., via Supabase JS client)

**Expected:**

- RLS policy restricts results to only Tenant A's own records
- No cross-tenant data leakage

---

### TC-SEC-002 — RLS: Agent Cannot See Other Company's Data

**Expected:**

- All tables with `company_id` column enforce RLS to the authenticated user's company
- Cross-company data inaccessible

---

### TC-SEC-003 — JWT Expiry on Edge Functions

**Steps:**

1. Call `tenant-payment` edge function with an expired JWT

**Expected:**

- Edge function returns `401 Unauthorized`
- No payment record created

---

### TC-SEC-004 — Paystack Secret Key Not Exposed to Client

**Expected:**

- `PAYSTACK_SECRET_KEY` only accessible within Supabase Edge Function environment
- No secret appears in `window.__ENV__`, network responses, or client JS bundles
- `VITE_*` env vars only contain public Supabase URL and anon key

---

### TC-SEC-005 — Document Access Control

**Steps:**

1. Attempt to access a document URL from another tenant's application

**Expected:**

- Supabase Storage RLS denies access
- 403 or signed URL validation failure

---

### TC-SEC-006 — Invalid Application ID in Invoice

**Steps:**

1. Navigate to `/invoice/non-existent-uuid`

**Expected:**

- "Invoice data not available" message shown
- No unhandled error or crash

---

### TC-SEC-007 — XSS in Tenant Name

**Steps:**

1. Register with name `<script>alert(1)</script>`

**Expected:**

- Name stored escaped in DB
- Rendered as text (not executed) on all pages including the invoice

---

## 14. Infrastructure & Deployment

### TC-INFRA-001 — Docker Build

**Steps:**

```bash
docker build -t leaseflow-frontend .
docker run -p 8080:80 leaseflow-frontend
```

**Expected:**

- Build succeeds with Node 20-alpine base
- App served on port 80 inside container
- Nginx serves SPA (all routes redirect to `index.html`)

---

### TC-INFRA-002 — Environment Variable Injection

**Preconditions:** `.env.production` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`  
**Expected:**

- Vite bakes vars into the bundle at build time
- App connects to correct Supabase project in production

---

### TC-INFRA-003 — Kubernetes Deployment Health Probes

**Expected:**

- Liveness probe: HTTP GET `/` returns 200
- Readiness probe: HTTP GET `/` returns 200
- Pod restarts automatically on failure

---

### TC-INFRA-004 — Nginx SPA Routing

**Expected:**

- Direct navigation to `/dashboard`, `/tenant-portal/:id`, `/invoice/:id` all return `index.html` (not 404)
- React Router handles client-side routing

---

### TC-INFRA-005 — Edge Function Deployment

**Steps:**

```bash
supabase functions deploy tenant-payment --project-ref <ref>
supabase functions deploy credit-check --project-ref <ref>
```

**Expected:**

- Functions deployed successfully
- `supabase functions list` shows both as deployed
- Health check: POST to function URL with valid JWT returns expected response

---

### TC-INFRA-006 — Storage Buckets Exist

**Steps:**

1. Navigate to Supabase Dashboard → Storage

**Expected:**

- `unit-images` bucket exists (public or with RLS)
- `documents` bucket exists (private with RLS)

---

## Quick Reference: Manual Setup Checklist

| Step                      | Command / Action                                                                 |
| ------------------------- | -------------------------------------------------------------------------------- |
| 1. Run schema migrations  | Paste each `scripts/sql/*.sql` into Supabase SQL Editor in date order            |
| 2. Deploy edge functions  | `supabase functions deploy tenant-payment --project-ref <ref>`                   |
| 3. Deploy edge functions  | `supabase functions deploy credit-check --project-ref <ref>`                     |
| 4. Set Paystack key       | `supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx --project-ref <ref>`       |
| 5. Set credit check mode  | `supabase secrets set CREDIT_CHECK_PROVIDER=mock --project-ref <ref>`            |
| 6. Create storage buckets | Supabase Dashboard → Storage → New Bucket: `unit-images`, `documents`            |
| 7. Set frontend env vars  | Copy `.env.example` → `.env.local`, fill in Supabase URL + anon key              |
| 8. Build and deploy       | `docker build -t leaseflow-frontend . && docker push` or `kubectl apply -f k8s/` |

---

_Generated by LeaseFlow dev tooling. Last updated June 2026._
