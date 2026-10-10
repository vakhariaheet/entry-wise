# EntryWise Dashboard (`apps/app`) — UI Bug Report

**Date:** 2026-10-10
**Scope:** The React/Vite admin dashboard in `apps/app`, plus how it talks to the API.
**Method:** full source review of `apps/app/src`, **plus a live pass through the deployed dashboard** at `https://entrywise-app.pages.dev` (driven in the signed-in Chrome session, on the "Demo" form, non-destructively). Findings tagged **[LIVE]** were reproduced in the running app; **[CODE]** are confirmed from source with high confidence (not separately reproduced live, usually because they need specific data/config).

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low.

---

## 🔴 D1 — CSV Export is completely broken (401) **[LIVE]**

**Where:** `App.tsx:328` `handleExportCsv` → `window.open(api.getExportUrl(site.id), '_blank')`; `lib/api-client.ts:357` returns the bare URL. The backend export route (`/v1/sites/{id}/submissions/export`) is behind `verifyAuth` and requires a `Bearer` token.

`window.open` performs a plain top-level GET with **no `Authorization` header**, so the export endpoint rejects it.

**Reproduced live:** clicking **Export CSV** on the Demo inbox opened a new tab at
`https://entrywise.si/v1/sites/site_77ead885…/submissions/export` showing:
```json
{"type":".../problems/unauthorized","title":"Unauthorized","status":401,
 "detail":"Authentication token or valid API key is required"}
```
The user gets a raw JSON error page, never a file. Export is non-functional for every user.

**Fix:** fetch the export with the auth header and trigger a client-side download (fetch → `blob()` → object URL → `<a download>`), or have the backend accept a short-lived signed token / the site `api_key` as a query param specifically for export and build that URL. Don't rely on `window.open` for an authenticated resource.

---

## 🔴 D2 — Auth token goes stale; actions fail after ~60s with "Invalid or untrusted Clerk authentication token" **[LIVE]**

**Where:** `lib/api-client.ts` keeps a single `private token` set via `setAuthToken` (lines 6–20). `App.tsx` refreshes it with `getToken()` only inside the `load*` callbacks (workspaces/sites/submissions/fields). Mutation handlers and sub-views call `api.*` **directly on the cached token without refreshing it** — e.g. `handleUpdateStatus`/`handleDeleteSubmission` (`App.tsx:217,232`), `GeneralSettingsView.handleSave`, `SchemaFieldsView.handleSave`, `EmailTemplateView` save/test, and `ConnectorsView`'s `listWebhooks`. Clerk session JWTs are short-lived (~60s).

**Reproduced live:** after the dashboard had been open a couple of minutes, opening **Integrations** threw in the console:
```
Failed to load webhooks: Error: Invalid or untrusted Clerk authentication token
    at Object.listWebhooks (…)
```
Immediately after a page **reload**, the same Integrations tab loaded the webhooks panel fine ("No webhooks configured yet"). So the failure is purely the cached token having expired.

**Impact:** leave the dashboard open, come back, and the next archive / delete / save / webhook-load silently 401s (surfaced as an `alert()` or a swallowed console error). Intermittent, hard-to-reproduce-for-users "it didn't save" behavior across the whole app.

**Fix:** make the API client fetch a fresh token per request. Either inject a `getToken` getter into the client and `await` it in `getAuthHeaders`, or add a response interceptor that refreshes on 401 and retries once. Don't cache a 60-second token on a long-lived page.

---

## 🟠 D3 — Dashboard crashes to a white screen when Clerk isn't configured **[CODE]**

**Where:** `main.tsx:34–40` renders `<App isClerkConfigured={false}>` **outside** any `ClerkProvider` when `VITE_CLERK_PUBLISHABLE_KEY` is unset. But `App()` (`App.tsx:742`) and `AppContent()` (`:53`) call `useAuth()` from `@clerk/clerk-react` on their first line, which **throws** without a provider ancestor.

**Impact:** a clone/deploy without the Clerk key renders a blank page (error boundary/white screen). The friendly "Clerk Publishable Key Missing" panel in `AuthScreen.tsx:102` is unreachable dead code. Bad first-run/self-host experience and a confusing failure mode.

**Fix:** when `!isClerkConfigured`, render the setup/notice screen directly and never mount components that call Clerk hooks; or always wrap in a provider and gate hook usage.

---

## 🟠 D4 — Production app is running Clerk **development** keys **[LIVE]**

**Where:** deployment env (`VITE_CLERK_PUBLISHABLE_KEY` is a `pk_test_…` dev key). Observed on the live site.

**Reproduced live:** console on `entrywise-app.pages.dev`:
```
Clerk: Clerk has been loaded with development keys. Development instances have strict
usage limits and should not be used when deploying your application to production.
(loaded from dynamic-rooster-2829.clerk.accounts.dev)
```

**Impact:** Clerk dev instances have hard usage caps (sign-ins throttled once you hit limits), weaker security posture, and a dev-only JWKS issuer. This compounds the backend's Clerk-issuer trust issue. Not production-ready.

**Fix:** provision a Clerk production instance and set the live `pk_live_…` key (and matching backend issuer allow-list) for the deployed app.

---

## 🟠 D5 — Inbox is capped at 20 submissions; no pagination **[CODE]**

**Where:** `App.tsx:163` `loadSubmissions` calls `api.listSubmissions(site.id, { status })` and **never passes `limit`/`offset`**; the backend defaults to `limit=20`. `SubmissionsTable.tsx` has **no pagination control** — the footer just says "Showing N of {submissions.length}" (`:703`).

**Impact:** only the newest 20 submissions are ever visible or reachable in the dashboard. On a busy form, every submission past the first 20 is invisible in the UI (they exist in the DB, but there's no way to page to them, and Export is broken too — see D1). The "Total Inflow" tile will show e.g. 350 while the table can only ever show 20.

**Fix:** add pagination (or infinite scroll / "load more") wired to `limit`/`offset`, which `api.listSubmissions` already supports.

---

## 🟡 D6 — KPI tiles are computed from the loaded page, and "Turnstile Verified" is a fabricated metric **[LIVE]**

**Where:** `SubmissionsTable.tsx:60–80` computes `counts` from the in-memory `submissions` array (≤20 rows, and already narrowed by the active server status filter). The tiles then show:
- **"Turnstile Verified" = `counts.all − counts.spam`** (`:337`) — this has nothing to do with Turnstile.
- **"New Unread" / "Spam Blocked"** from the ≤20-row page, not the real totals.

**Reproduced live:** the Demo inbox shows **"Turnstile Verified: 2"**, but **Settings → Cloudflare Turnstile is toggled OFF** for that form. The two rows are a CLI test and a pipeline mock — neither was Turnstile-verified. The number is just `2 − 0`.

**Impact:** the headline metrics are misleading/false; "Turnstile Verified" actively misrepresents security posture, and the counts drift from reality once there are >20 submissions or a filter is active.

**Fix:** drive KPI numbers from server-side aggregates (a counts endpoint or `total_count` per status), and either compute "Turnstile Verified" from a real signal or remove that tile.

---

## 🟡 D7 — Email Studio bleeds one form's template into another on form switch **[CODE]**

**Where:** `EmailTemplateView.tsx:959–992` re-syncs on `site` change, but only **sets** keys that exist in the new `site.auto_responder_config` (`if (autoConf.customHtml) setAutoCustomHtml(...)`, etc.) and **never clears** them when absent. Switching from a form that has a template to one that has none (or a partial config) leaves the previous form's subject/HTML/blocks loaded in the editor.

**Impact:** on the Email Studio tab, switching the active form can show Form A's template under Form B, and hitting **Save** writes A's content onto B's `auto_responder_config` — silent cross-form template corruption.

**Fix:** reset every piece of editor state to a default at the top of the sync effect before applying the new config (or remount via `key={site.id}` on `<EmailTemplateView>`), exactly as `GeneralSettingsView`/`SchemaFieldsView` already fully re-init.

---

## 🟡 D8 — Inbox search only searches the 20 loaded rows **[CODE]**

**Where:** `SubmissionsTable.tsx:82–90` filters the in-memory page client-side. The API supports server-side `query` (`api-client.ts:255`), but `App.loadSubmissions` never passes `search`. So searching finds matches only within the ≤20 currently loaded submissions, giving false "no results" for anything older.

**Fix:** debounce the search box into `loadSubmissions({ search })` so it queries the backend (`data LIKE`), and page the results.

---

## ⚪ D9 — Secrets shown in plaintext in the UI (and prefilled) **[LIVE]**

**Where:** the site `api_key` is rendered in plaintext in the inbox header (`App.tsx:477`), Settings (`GeneralSettingsView.tsx:276`), and Code & SDK; the **Turnstile secret key** is prefilled into the Settings password field (`GeneralSettingsView.tsx:513`) because the backend returns it on `GET /sites` (see backend report M2). Observed live on the Demo form.

**Impact:** the public ingestion `api_key` is arguably fine to show, but the **Turnstile secret** is a server-side secret and shouldn't round-trip to the browser at all. Anyone who can read the site object (including via the backend's cross-tenant BOLA) harvests it.

**Fix:** stop returning `turnstile_secret_key`/`webhook_secret` from read endpoints (backend), and in the UI show only a "configured / replace" affordance rather than the value.

---

## ⚪ D10 — Code generator can emit a self-sabotaging field, no warning **[CODE]** (ties to backend H3)

**Where:** `CodeEmbedView.tsx` generates `<input name="{field.name}">` for every schema field, and `SchemaFieldsView` lets users name a field `website` or `url`. The backend treats `website`/`url` as honeypots and silently drops any submission containing them (backend report H3). The generator's own hidden honeypot (`_gotcha`, `:372`) is correct — the problem is user-named fields colliding.

**Impact:** a user adds a `website` field, copies the generated form, and every real submission is silently discarded with a success response. Nothing in the schema editor or code view warns them.

**Fix (frontend side):** warn when a schema field name collides with a reserved honeypot name; ideally fix the collision in the backend (H3) so these common names are safe.

---

## Things that worked (verified live)
- All six dashboard tabs render without crashes (Inbox, Form Schema, Email Studio w/ live preview, Integrations, Code & SDK, Settings).
- Email Studio visual-blocks editor and live iframe preview render correctly; no `dangerouslySetInnerHTML` anywhere (preview uses sandboxed `srcDoc`).
- Status filter pills, bulk selection bar, keyboard shortcuts, and the delete/confirm flows are wired and responsive.
- Generated snippets (React/Next, Server Action, cURL, Plain HTML) match the live schema fields.

## Suggested fix order
1. **D1, D2** — export is dead and actions silently fail after a minute; both are everyday-use breakers.
2. **D3, D4, D5** — crash-on-misconfig, dev keys in prod, and the 20-row cap.
3. **D6–D10** — correctness/clarity and the cross-form template bleed.

(Backend issues are covered separately in `BUG_REPORT.md`; D2/D4/D9/D10 each have a backend counterpart.)
