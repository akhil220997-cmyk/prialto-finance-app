# Getting API access: Salesforce, QuickBooks Online, Time Doctor

This app needs one OAuth "app"/client registered in each system before it can pull live
data. None of this touches production data by itself — registering an app just gets you
a Client ID + Secret to put in `.env`. Budget about half a day total if you already have
admin rights in all three systems; longer if you need someone else (IT, a QBO company
admin) to grant access.

Whoever does this should be a Prialto admin/owner in each system — these are the
minimum roles needed per step.

---

## 1. Salesforce

**Who can do this:** a Salesforce System Administrator on Prialto's org.

1. Setup → App Manager → **New Connected App**.
2. Enable OAuth Settings. Set the callback URL to
   `https://<your-app-domain>/api/auth/callback/salesforce` (and
   `http://localhost:3000/api/auth/callback/salesforce` for local dev).
3. OAuth scopes needed: `api` (Manage user data via APIs), `refresh_token, offline_access`.
4. Save, then wait ~10 min for the Connected App to propagate.
5. Copy the **Consumer Key** (`SALESFORCE_CLIENT_ID`) and **Consumer Secret**
   (`SALESFORCE_CLIENT_SECRET`).
6. Note your **instance URL** (e.g. `https://prialto.my.salesforce.com`) —
   `SALESFORCE_INSTANCE_URL`.
7. Data this app reads: `Opportunity` (bookings/pipeline), `Account` (clients), and any
   custom fields tracking Prialto Units per deal. If those custom fields don't exist yet
   (e.g. "# Units", "Tier"), that's a 10-minute admin task worth doing before go-live —
   otherwise unit counts have to be inferred from the Amount field.

Docs: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/

## 2. QuickBooks Online

**Who can do this:** the QBO company Admin (usually someone on the finance team).

1. Create an app at the Intuit Developer portal: https://developer.intuit.com/app/developer/myapps
2. Create a new project → choose **QuickBooks Online and Payments**.
3. Under "Keys & OAuth", add the redirect URI:
   `https://<your-app-domain>/api/auth/callback/quickbooks`.
4. Copy the **Client ID** and **Client Secret** (`QBO_CLIENT_ID` / `QBO_CLIENT_SECRET`).
   Use the **Production** keys once you're ready to go live — Sandbox keys only work
   against Intuit's fake sandbox company, which is fine for the first phase of testing.
5. Scope needed: `com.intuit.quickbooks.accounting`.
6. After the finance admin completes the OAuth consent flow once (inside the app), the
   app stores a `realmId` (your QBO company ID) and refresh token — no further manual
   steps after that; QuickBooks refresh tokens auto-rotate for up to 100 days of
   inactivity, so a working sync keeps the connection alive indefinitely.
7. **Important 2026 note:** Intuit is retiring several legacy QuickBooks Reports API
   endpoints (transaction-detail and list-style reports) on **June 30, 2026**. This app
   is built against the documented Accounting API entities (`Invoice`, `Bill`, `Payment`,
   `JournalEntry`, `Account`) rather than the legacy reports, specifically to avoid that
   cutover breaking anything.

Docs: https://developer.intuit.com/app/developer/qbo/docs/get-started

## 3. Time Doctor

**Who can do this:** a Time Doctor company Owner/Admin.

1. Time Doctor web app → **Settings → API** (Time Doctor 2 API), or generate a personal
   API token from your account if company-level OAuth isn't enabled on your plan.
2. If OAuth is available: register an app, redirect URI
   `https://<your-app-domain>/api/auth/callback/timedoctor`, copy Client ID/Secret.
3. Note your **Company ID** — most Time Doctor API calls are scoped per company.
4. Data this app reads: `time entries`/`worklogs` per user per project (mapped to
   Prialto's assistant → client assignment) and `users` (to map Time Doctor accounts to
   delivery region — Guatemala/Manila/Nairobi — for the cost-by-region views).

Docs: https://api2.timedoctor.com/ · https://support.timedoctor.com/knowledge/how-to-use-the-time-doctor-api

---

## Once you have all three

Drop the values into `.env` (see `.env.example` in the repo root) and set
`USE_MOCK_DATA=false`. Run `npm run sync:all` once to do an initial full backfill, then
the scheduled sync job (see `README.md` → "Scheduling syncs") keeps data current.

Until real credentials are in place, the app runs fully on realistic seed/mock data
(`USE_MOCK_DATA=true`, the default) so the dashboards, filters, and UI can be reviewed
and signed off before any real financial data touches it.
