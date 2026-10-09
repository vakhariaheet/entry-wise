# EntryWise — UX Principles & Feature Roadmap

A plan for what to build next, grounded in the UX canon and the form‑backend competitive landscape.
Written alongside the security/UX fixes already shipped on `fix/security-and-ux-hardening`.

---

## Part 1 — The lens: UX canon, one rule each

The "bestseller" UX books mostly agree. Here is the usable distillation, each mapped to how it should shape EntryWise.

| Book | The one rule | What it means for EntryWise |
|---|---|---|
| **Don't Make Me Think** — Krug | Make every screen self‑evident; remove question marks. | No tab or metric should need explaining. (The old "Turnstile Verified" tile broke this — it was invented; now fixed.) |
| **The Design of Everyday Things** — Norman | Affordances + signifiers + immediate feedback; prevent errors, don't just report them. | Every action gets instant optimistic feedback; destructive actions are guarded; the embed snippet should stop the user making a mistake (reserved field names, missing honeypot). |
| **Refactoring UI** — Wathan & Schoger | Hierarchy, spacing and a limited palette do most of the work; design the empty and error states first. | The dashboard is already strong here; the gap is *empty states that teach* and consistent toasts instead of `alert()`. |
| **Web Form Design** — Wroblewski | Shorten the path to completion; **inline validation** is the single biggest lever. | His data: inline validation → **+22% completions, 42% faster, 22% fewer errors.** EntryWise should *generate* that validation into every embed snippet. |
| **Laws of UX** — Yablonski | Hick's (fewer choices), Fitts's (big, close targets), Jakob's (match conventions), Miller's (chunk to ~5–7). | Keep the 6‑tab IA; add a ⌘K command palette so power users skip the hunt. |
| **About Face** — Cooper | Design for goals, not features; distinguish the daily "inbox" user from the one‑time "setup" user. | Two jobs: *triage leads fast* (daily) and *wire up a form* (once). The inbox should be Superhuman‑fast; setup should be a guided checklist. |
| **Atomic Design** — Frost | Build from a documented component system. | Promote the ad‑hoc toggles/cards into a small design‑system (also fixes the secret‑field and toast inconsistencies). |

**The throughline:** EntryWise's users have two goals — *ship a form in 5 minutes* and *never miss a lead*. Every feature below serves one of those two.

---

## Part 2 — Where EntryWise stands today

**Strong:** keyboard‑first inbox, bulk actions, visual email studio, Cloudflare‑native speed, progressive‑disclosure settings, generated SDK snippets. The craft bar is already Linear/Resend‑tier.

**Just fixed (this branch):** CSV export, token‑refresh reliability, the Clerk‑missing crash, inbox pagination, the fabricated metric, cross‑form template bleed, and the backend tenant‑isolation/secret issues from `BUG_REPORT.md`.

**Gaps vs. the market (Formspree, Basin, Getform/Forminit, Web3Forms, Netlify, Formcarry):** stored **file uploads**, **analytics**, **team/roles**, **webhook delivery logs/retries**, **reply‑from‑inbox**, duplicate/geo spam filters, and anything that serves the **agency/white‑label** use case — which is EntryWise's natural ICP.

---

## Part 3 — The roadmap (Now / Next / Later)

Each item is scoped as a single reviewable feature (one branch/PR, buildable with Claude Code). Effort is rough: S ≈ a day, M ≈ 2–4 days, L ≈ a week+.

### NOW — highest leverage, mostly self‑contained

**1. Reply to a lead from the inbox** · *Goal: never miss a lead* · **M**
Compose + send a reply to a submission's email, through the form's existing provider, without leaving the drawer. Closes the loop that every agency hits daily.
*Why:* Cooper (serve the daily goal), Krug (don't make them copy‑paste into Gmail). *Build:* reuse the email‑send service + the submitter‑email auto‑detection already in the pipeline.

**2. Submissions analytics overview** · *Goal: trust + insight* · **M**
A header strip + a small page: submissions/day sparkline, spam‑rate, top forms, conversion if a view‑count pixel is added. Replaces vanity tiles with real, server‑aggregated numbers.
*Why:* Norman (feedback), Refactoring UI (hierarchy). *Build:* a `/v1/sites/{id}/submissions/stats` endpoint (also fixes the page‑scoped KPI counts) + one chart. Follow the repo's dataviz conventions.

**3. Server‑side search + saved views** · *Goal: find a lead fast* · **S–M**
Wire the search box to the backend `query` param (today it only filters the 25 loaded rows), add debounce, and let users save filters ("New this week", "Has attachment", "From acme.com").
*Why:* Krug, Hick's Law. *Build:* lift search into `loadSubmissions`; persist saved views per site.

**4. Required fields + inline validation, generated into the embed** · *Goal: ship a better form* · **M**
Let a schema field be marked required / given a pattern; generate the matching client‑side validation + friendly messages into every snippet (HTML/React/etc.), and enforce server‑side.
*Why:* **Wroblewski's biggest lever** (+22% completions). *Build:* extend the fields schema (`required`, `pattern`), the validator, and `CodeEmbedView`.

**5. Toasts + optimistic UI (kill `alert()`)** · *Goal: craft* · **S**
Replace blocking `alert()`/`window.confirm()` with a toast system and inline confirmations.
*Why:* Norman (feedback), Refactoring UI. *Build:* one small toast provider; swap call sites.

### NEXT — real differentiators

**6. File uploads to R2 with expiring download links** · **L**
Store attachments in R2 (the binding already exists, currently unused) instead of only base64‑emailing them; show them in the drawer with signed, time‑limited URLs. Table stakes vs. every competitor.
*Why:* parity + the secure `/files` route is now auth‑gated and ready. *Build:* upload in `submitForm`, metadata already persisted, add a secure download controller.

**7. Team & roles** · *Goal: agencies* · **L**
Invite teammates to a workspace with viewer/editor roles; the multi‑tenant spine (companies→sites, Clerk users) is half‑built already.
*Why:* Cooper (different users, different rights); unlocks the agency ICP. *Build:* a memberships table + `assertCompanyOwnership` extended to membership.

**8. Webhook delivery log + retries + replay** · **M**
Per‑webhook history (status, latency, response), automatic retries with backoff (the queue already retries), a "replay" button, and one‑click secret rotation.
*Why:* Norman (visible system status); matches Basin's signed‑webhook‑with‑retries bar. *Build:* a `webhook_deliveries` table + a panel in Connectors.

**9. Notification routing rules** · *Goal: never miss / less noise* · **M**
"If `budget` > X or `subject` contains 'urgent' → notify this email / Slack channel / tag as priority." A simple rules UI over the fields.
*Why:* makes the daily job calmer (About Face goals). *Build:* a rules table evaluated in `submissionProcessor`.

**10. Triage: tags + assignee (lightweight CRM)** · **M**
Notes already exist — add tags and an assignee so a team can divide a shared inbox. Keeps EntryWise from forcing users into a separate CRM.
*Why:* serves the daily goal without scope‑creeping into Salesforce. *Build:* columns + filter chips + the saved‑views work from (3).

### LATER — strategic bets

**11. White‑label client portals** · *Goal: the agency ICP, directly* · **L**
A read‑only, branded submission inbox you can hand a client under their own domain — your agency builds the form, the client watches leads arrive. This is the feature most aligned with EntryWise's actual buyer.
*Why:* turns a form backend into an agency product. *Build:* a scoped read token + a minimal themed inbox view.

**12. Spam intelligence** · **M–L**
Duplicate detection, per‑IP/geo anomaly flags, and optional AI spam scoring — alongside the honeypot/Turnstile/keyword tools already shipped. Matches Basin's spam suite (the thing users say costs them the most time).

**13. GDPR data‑subject tools + audit log** · **M**
"Delete all submissions for this email", "export everything for this email", and an audit trail. Retention + IP anonymization already exist; this completes a compliance story that Formspree/Formcarry sell on.

**14. Scheduled exports & deeper integrations** · **M**
Weekly CSV to email, native Zapier/Make, two‑way Google Sheets. Removes the manual export chore entirely.

**15. ⌘K command palette + status page** · **S + M**
A Linear‑style palette (jump to a form, change filter, run a test) for power users, and a public status/uptime page for trust.

---

## Part 4 — Suggested sequencing

1. **Sprint 1 (craft + daily goal):** #5 toasts, #3 search/saved‑views, #1 reply‑from‑inbox.
2. **Sprint 2 (insight + conversion):** #2 analytics (+ the stats endpoint that also fixes KPI counts), #4 inline validation in embeds.
3. **Sprint 3 (differentiate):** #6 file uploads, #8 webhook logs.
4. **Then the ICP bet:** #7 teams → #11 white‑label client portals.

If you only do three things: **reply‑from‑inbox, real analytics, and inline‑validation‑in‑the‑embed.** The first two make the daily job delightful; the third measurably raises the completion rate of every form EntryWise powers — which is the product's whole promise.

---

### Sources
- [Web Form Design (Luke Wroblewski) — slides](https://static.lukew.com/WebForms_LukeW_101209.pdf) · [book summary](https://www.blinkist.com/books/web-form-design-en)
- [Form‑backend comparison, 2026 (merginit)](https://merginit.com/blog/24062026-free-form-backend-services-comparison)
- [Best form backends for static sites, 2026 (formgrid)](https://formgrid.dev/blog/the-best-form-backend-for-static-sites-in-2026)
- Reference books: *Don't Make Me Think* (Krug), *The Design of Everyday Things* (Norman), *Refactoring UI* (Wathan/Schoger), *Laws of UX* (Yablonski), *About Face* (Cooper), *Atomic Design* (Frost).
