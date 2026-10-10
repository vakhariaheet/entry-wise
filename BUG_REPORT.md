# EntryWise — Deep Testing Bug Report

**Date:** 2026-10-10
**Scope:** `src/` Cloudflare Worker (Hono) API, migrations, email/queue pipeline, `apps/app` contract.
**Method:** full source read + live run. Built the worker with `wrangler dev` (local D1/KV/Queues), applied all migrations, and exercised every endpoint with real HTTP requests. Every finding below was **reproduced against the running worker** unless marked "code-level". The repo's own unit tests (38) pass and are not affected — they cover pure utils, not the HTTP authorization layer where the real bugs live.

Severity legend: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low/correctness.

---

## 🔴 C1 — Cross-tenant authorization bypass on Company endpoints (site API key = admin)

**Where:** `src/controllers/v1/companies/{listCompanies,getCompany,patchCompany,deleteCompany,testCompanyEmail}.ts` — every one gates tenant scoping behind `if (jwtPayload?.role === 'clerk_user' && jwtPayload?.user_id)`.

A site API key (`ew_live_...`) authenticates as `role: 'site_owner'`. Because the ownership filter only triggers for `clerk_user`, a `site_owner` token falls through with **no `WHERE` restriction at all** — i.e. the same global access as the master admin key. The site key is supposed to be the *least* privileged credential (scoped to one site), yet it can read/modify/delete **every company in the database**.

**Reproduced** (attacker holds only a site key for an unrelated site):
```
# list every tenant's company
curl -H "X-Api-Key: ew_live_<attacker_site_key>" /v1/companies
→ 200, total_count=4  (HoneyCo, TenantA, TenantB, Acme Co …)

# read an arbitrary company by id
curl -H "X-Api-Key: ew_live_<attacker>" /v1/companies/<victim_company_id>   → 200 (full record)

# OVERWRITE another tenant's company incl. email provider token
curl -H "X-Api-Key: ew_live_<attacker>" -X PATCH /v1/companies/<victim> \
     -d '{"name":"PWNED","email_provider":"resend","email_provider_token":"attacker_token"}'
→ 200   readback: name=PWNED provider=resend

# DELETE another tenant's company — cascades to its sites, fields, submissions
curl -H "X-Api-Key: ew_live_<attacker>" -X DELETE /v1/companies/<victim>
→ 204   victim company now 404, victim site now gone
```

**Impact:** complete multi-tenant isolation failure. Any customer (or anyone who phishes/reads one site key) can enumerate all workspaces, exfiltrate config, inject their own email-provider token into a victim workspace (hijack victim's outbound mail / capture replies), and **destroy any workspace with cascade**. This is the single most serious issue.

**Proof it's inconsistent, not intended:** `DELETE /v1/sites/{id}` *is* protected — `deleteSite` calls `assertSiteOwnership` and correctly returns **403** for the same attacker key. The company controllers simply never got the equivalent check.

**Fix:** introduce an `assertCompanyOwnership(c, companyId)` mirroring `assertSiteOwnership`, and call it in all five company controllers. A `site_owner` token must only reach its own `company_id`; `admin_api_key` stays global; `clerk_user` restricted to owned/`comp_default`. Do not rely on a role-specific `if` that silently no-ops for other roles — default-deny instead.

---

## 🔴 C2 — Missing object-level authorization on all Field endpoints (BOLA)

**Where:** `src/controllers/v1/fields/{createField,listFields,patchField,deleteField,replaceFields}.ts`. None call `assertSiteOwnership`. `createField`/`replaceFields` only check the site *exists*; `deleteField` deletes **by field id with no site scoping at all** (`DELETE FROM fields WHERE id = ?`, ignoring the `:site_id` in the route).

**Reproduced** (Site A key operating on Site B):
```
GET    /v1/sites/<siteB>/fields           (X-Api-Key: keyA) → 200, returns Site B's fields
POST   /v1/sites/<siteB>/fields           (X-Api-Key: keyA) → 201, "evil" field created on B
DELETE /v1/sites/<siteB>/fields/<fieldB>  (X-Api-Key: keyA) → 204, Site B's field deleted
```

**Impact:** any authenticated principal (any site key, any Clerk user) can read, add, rename, retype, or delete the form schema of any other tenant's site — corrupting validation and form rendering for victims.

**Fix:** call `assertSiteOwnership(c, siteId)` at the top of every field controller; in `deleteField`/`patchField` scope the query by `site_id` as well as `id`.

---

## 🔴 C3 — Authentication bypass + SSRF via attacker-controlled Clerk issuer/JWKS

**Where:** `src/middleware/auth.ts` lines ~108–133.

The middleware base64-decodes the JWT payload **before any signature check**, then if `issuer.includes('clerk')` **or** `unverifiedClaims.sub?.startsWith('user_')` it calls `getRemoteJWKS(issuer)` using the **issuer from the unverified token** and verifies against that JWKS. The issuer URL is attacker-chosen and is **not** passed through `isSafeExternalUrl`.

**Reproduced (SSRF confirmed live):** a token with `sub:"user_attacker"`, `iss:"http://127.0.0.1:8787/evil-jwks"` caused the worker to fetch the attacker URL:
```
[wrangler:info] GET /evil-jwks/.well-known/jwks.json  (outbound fetch to attacker-controlled issuer)
```

**Impact:**
- **SSRF:** server issues GET to any URL an unauthenticated caller puts in `iss` (internal metadata endpoints, internal services, etc.). No allow-list.
- **Full auth bypass (code-level, high confidence):** an attacker hosts a JWKS at their own domain and signs a token with their matching private key, `sub:"user_<victim or anything>"`. `jwtVerify(token, jwks, {issuer})` succeeds (issuer matches, signature verifies against the attacker's key), and the request is accepted as `role: clerk_user, user_id: <attacker-chosen>`. They then act as any Clerk user — owning/reading that user's companies and sites. (Not run end-to-end only because it needs an externally reachable JWKS host; the code path is unambiguous and the SSRF fetch proves the issuer is taken from the unverified token.)

**Fix:** pin the issuer to a configured allow-list of trusted Clerk domains (e.g. `*.clerk.accounts.dev` / your instance), never derive the JWKS URL from untrusted claims; validate `iss`/`aud` against expected constants after verification; drop the `sub.startsWith('user_')` shortcut entirely.

---

## 🟠 H1 — Cross-tenant test-email abuse

**Where:** `src/controllers/v1/sites/testSiteEmail.ts` lines ~40–45. Ownership is checked only for `clerk_user`; a `site_owner` key skips the check and proceeds to send.

**Reproduced:** Site A's key against `/v1/sites/<siteB>/test-email` with `{"recipient_email":"attacker@evil.com"}` was **not** rejected with 403 — it reached the email-send stage and returned `400 "Failed to send test site email: Cloudflare email delivery failed …"` (fails only because local dev has no real SMTP). With a real provider configured on Site B, the mail would send using **Site B's company email provider and verified sender** to an attacker-chosen recipient.

**Impact:** send mail from another tenant's verified domain/sender (spoofing, reputation burn, quota/credit theft).

**Fix:** `assertSiteOwnership(c, siteId)` before sending; apply the same company-ownership check (C1) since it also reads the parent company's provider token.

---

## 🟠 H2 — Mass assignment on legacy `PUT /sites/:company_id/:id` (and legacy company/field routes)

**Where:** `src/controllers/sites/updateSite.ts` (and `companies/updateCompany.ts`) build the `UPDATE` from **arbitrary request-body keys with no column allow-list**, unlike v1 `patchSite` which has `ALLOWED_SITE_COLUMNS`. The legacy routers are mounted in `src/index.ts` (`/sites`, `/companies`, `/fields`) behind only `verifyAuth`.

**Reproduced:**
```
PUT /sites/<company_id>/<site_id>
    -d '{"user_id":"user_hijacker","api_key":"ew_live_HIJACKED_KEY_0000000000000000"}'
→ 200   readback: user_id=user_hijacker  api_key=ew_live_HIJACKED_KEY_0000000000000000
```

**Impact:** overwrite protected columns — rotate a site's `api_key` to an attacker-known value, reassign `user_id`/`company_id` (steal or orphan a site), or set `id`. Legacy `updateSite` also performs **no ownership check** beyond "row exists," so it's a second BOLA surface.

**Fix:** either delete the legacy `/companies`,`/sites`,`/fields` routers (v1 supersedes them) or give them the same allow-list + `assertSiteOwnership`/`assertCompanyOwnership` as v1.

---

## 🟠 H3 — Honeypot field names silently destroy legitimate submissions

**Where:** `src/types/submission.ts:30` — `HONEYPOT_FIELDS = ['_gotcha', 'website', 'url', 'email_confirm']`; consumed in `src/controllers/v1/submissions/submitForm.ts` (form-data path line ~90, JSON path line ~43).

`website` and `url` are among the **most common legitimate contact-form fields** (and `url` is even an offered field *type*). Any submission that includes one is treated as a bot and **silently dropped**, while the client receives a success response (no `submission_id`), so neither the visitor nor the site owner notices the data loss.

**Reproduced** on a fresh site:
```
POST /f/<key>  (form)  name=Real Customer&email=real@customer.com&website=https://customer.com
→ {"is_success":true,"message":"Submission received successfully"}   (no submission_id)
POST /f/<key>  (form)  name=Second Customer&email=two@customer.com
→ {"is_success":true,"submission_id":"sub_…"}
Stored submissions: total_count=1  → only "Second Customer". The one with `website` is gone.
JSON body with top-level "website" → same silent drop.
```

**Impact:** a form backend that silently eats real leads for any form containing a `website`/`url` field. High-impact functional/data-loss bug.

**Fix:** make honeypots opt-in/configurable per site (don't hard-code common field names), or require a dedicated non-colliding name (e.g. `_gotcha` only). At minimum, don't collide with `url`/`website`; and consider logging honeypot drops.

---

## 🟡 M1 — JWT `exp` is emitted in milliseconds

**Where:** `src/controllers/auth/getToken.ts:18-19` — `exp: Date.now() + 1000*60*60` (ms). Standard JWT `exp` is **seconds** since epoch.

**Reproduced:** issued token payload `exp: 1791578274034` (13 digits = ms). `src/middleware/auth.ts` compensates with `payload.exp > 1e11 ? exp/1000 : exp`, so EntryWise's own middleware enforces the 1-hour window — but any spec-compliant verifier reads `exp` as the year ~58000, i.e. **never expires**. The "1-hour" guarantee rests entirely on a hand-rolled normalization; remove it and tokens are immortal. Hono's own `verify()` did not reject the malformed value.

**Fix:** `exp: Math.floor(Date.now()/1000) + 3600` and set `iat` in seconds; drop the ms-normalization hack.

---

## 🟡 M2 — Secrets returned in site GET/LIST responses

**Where:** `src/controllers/v1/sites/{getSite,listSites,patchSite}.ts` do `SELECT *` and return the row, so responses include `api_key`, `turnstile_secret_key`, and `webhook_secret`.

**Reproduced:** `GET /v1/sites/<id>` and `GET /v1/sites` both return `api_key: ew_live_…`, `turnstile_secret_key`, `webhook_secret`. Combined with C1/H2 this means a cross-tenant reader also harvests the victim's live submission key and Turnstile secret.

**Fix:** project explicit columns and omit secrets from read responses (expose `api_key` only once at create/rotate, or behind an explicit "reveal" action).

---

## 🟡 M3 — Global domain uniqueness across all tenants

**Where:** `src/controllers/v1/sites/createSite.ts:68-76` — `SELECT id FROM sites WHERE domain = ?` with no company/user scope.

**Reproduced:** creating `tenant-a.com` under a second company returns `409 "A site with domain 'tenant-a.com' already exists"`.

**Impact:** one tenant permanently blocks any domain for everyone else (squat/enumeration; a competitor can discover whether a domain is already onboarded).

**Fix:** scope uniqueness to `(company_id, domain)` (or `(user_id, domain)`).

---

## 🟡 M4 — Unauthenticated R2 object read + build error in `files` route

**Where:** `src/routes/files.routes.ts:8` mounts `GET /files/:key` with **no `verifyAuth`**; `src/controllers/files/getObject.ts:9` streams any R2 object by key. Also this file is the sole **TypeScript compile error** (below): `new Response(object.body, …)` — `ReadableStream` vs `BodyInit` type mismatch.

**Impact:** if R2 is populated, any object is downloadable by key with no auth or tenant scoping. (Current `submitForm` emails attachments as base64 rather than storing to R2, so it may be dormant — but the route is live and unauthenticated.)

**Fix:** remove the route or gate it behind auth + ownership and key-namespacing; fix the type (`object.body as unknown as ReadableStream` per workers-types, or return `object.body` via the Workers `Response`).

---

## ⚪ L1 — `tsc --noEmit` fails (CI/type gate broken)

`bun x tsc --noEmit` (the command in CLAUDE.md) exits non-zero with **1 error**: `src/controllers/files/getObject.ts(9,23): error TS2345: 'ReadableStream<any>' is not assignable to 'BodyInit'`. Any CI step relying on a clean typecheck is currently red. (`biome lint` also reports 75 warnings — mostly `noExplicitAny`/unused-params — non-blocking.)

## ⚪ L2 — DELETE webhook returns success for a non-existent id

**Where:** `src/controllers/v1/webhooks/deleteWebhook.ts:28`. D1 `.run()` returns `success: true` even when 0 rows match, so the `if (!success) → 404` branch is dead. **Reproduced:** `DELETE /v1/sites/<id>/webhooks/wh_does_not_exist → 204`. Check `meta.changes > 0` to return a correct 404. (Same latent pattern in `deleteSite` returning 500-vs-404 semantics.)

## ⚪ L3 — Export includes mock/test rows and drops `notes`

**Where:** `src/controllers/v1/submissions/exportSubmissions.ts` has no `is_test` filter and its row mapper omits `notes`. **Reproduced:** a `is_test=1` pipeline-smoke submission appears in `?format=csv` output alongside real data. (CSV formula-injection neutralization itself works correctly — e.g. `'+1 (555)…` is quoted.) Add an `is_test=0` default/filter and a `notes` column.

## ⚪ L4 — Rate-limit value mismatch + non-atomic + fail-open

**Where:** `src/middleware/publicAuth.ts:112` enforces **100/hour**; `CLAUDE.md` and the request-flow docstring say **50/hour**. The counter is a non-atomic KV read-modify-write (burst requests can exceed the cap) and fails **open** on KV error. Align the number with the spec, and consider the Cloudflare Rate Limiting binding or an atomic counter for correctness.

---

## Things that are correct (verified, not bugs)
- `assertSiteOwnership` on **site/submission** v1 endpoints correctly returns 403 cross-tenant (submissions, site get/patch/delete/export).
- AES-GCM encrypt/decrypt round-trips; provider tokens stored encrypted.
- CSV formula-injection defense (`escapeCsvCell`) works.
- HTML escaping in email templates; SSRF guard on **webhook/Slack/Discord/Sheets** dispatch (note: it is *not* applied to the Clerk issuer — see C3).
- Open-redirect guard on `_redirect`/`_next`.
- Public submit happy-path persists to D1 and enqueues delivery; honeypot/Turnstile/disposable/spam gating runs in the right order.

## Suggested fix order
1. **C1, C2, C3** (tenant isolation + auth bypass) — ship before any real multi-tenant traffic.
2. **H1, H2, H3** (email abuse, mass assignment, silent data loss).
3. **M1–M4**, then the L-items.

A central default-deny `authorizeCompany`/`authorizeSite` helper applied uniformly (instead of per-controller role `if`s) would close C1, C2, H1, and the legacy BOLA in one pass.
