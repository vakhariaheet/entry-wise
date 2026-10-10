# EntryWise for EmDash: research and implementation plan

Research date: 10 October 2026. Scope confirmed by the owner: a reusable EmDash plugin that simplifies EntryWise contact forms, notification emails, and related setup across websites. This is a plan; no application code or Cloudflare resources were changed.

## Recommendation

Build an EmDash connector backed by the existing EntryWise service. Start with a sandboxed admin plugin and a small optional Astro companion for placing forms in public pages. EntryWise remains responsible for submissions, spam checks, persistence, email providers, delivery jobs, and integrations.

The repeated installation experience should be: install, connect an EntryWise site, choose a contact-form preset, set recipients and an optional confirmation email, place the form, and run a delivery check. Site-specific configuration stays in settings; application logic stays in versioned packages.

## Research findings

EmDash supports sandboxed registry plugins and native npm plugins. Sandboxed plugins can provide hooks, private API routes, plugin storage, and declarative Block Kit admin pages. Native plugins are required for custom Portable Text components, Astro renderers, React admin code, and raw page fragments. The plugin format itself is not Cloudflare-specific. [Plugin formats](https://docs.emdashcms.com/plugins/creating-plugins/choosing-a-format/).

The official CLI already provides scaffolding, manifest validation, builds, bundles, and publishing. Its scaffold includes project guidance and a workerd-backed test. Use that foundation and pin the development toolchain. [Plugin CLI](https://docs.emdashcms.com/plugins/creating-plugins/cli/).

Cloudflare sandbox deployment requires Workers Paid, a Worker Loader binding named `LOADER`, the `PluginBridge` export, and a configured sandbox runner. The documented bridge uses the D1 binding named `DB`; Hyperdrive deployments are excluded. Current documented invocation limits include 50 ms CPU, 10 subrequests, and 30 seconds wall time. Verify these again against the pinned release during implementation. [Sandbox deployment](https://docs.emdashcms.com/deployment/plugin-sandbox/).

The registry already contains contact-form plugins with inboxes, exports, and notifications. EntryWise should differentiate through its existing backend, consistent management across client sites, reusable presets, and delivery visibility. A generic new form builder would duplicate existing products. [Current registry](https://plugins.emdashcms.com/).

## What the local repository establishes

- The root is a Hono Cloudflare Worker with D1-backed submission management. `apps/web` is an Astro site; the inspected package manifests do not contain EmDash.
- `src/controllers/v1/submissions/submitForm.ts` accepts JSON and browser form payloads, performs spam checks, and handles persistence and dispatch.
- `src/queue/submissionProcessor.ts` already implements recipient notifications, submitter confirmations, provider selection, webhooks, Slack, Discord, and Google Sheets delivery.
- `src/routes/v1/sites.routes.ts` has inbox, export, detail, update, and deletion routes scoped under a site.
- `src/middleware/auth.ts` permits the existing site API key to authenticate as `site_owner`; `src/middleware/authorize.ts` gives that caller access to its site. The public submission middleware looks up the same `sites.api_key`.
- The submission middleware currently resolves keys from the URL, header, or query string. A generated form must use a supported action URL; the README's hidden `api_key` field is not enough by itself.

These are static code observations, not a deployed security audit or proof that every documented feature works.

## Architecture

```text
EmDash admin -> sandboxed EntryWise plugin -> EntryWise management API
Website visitor -> HTML/Astro contact form -> EntryWise public submission API
EntryWise -> D1 submission record -> delivery queue -> email / integrations
```

Use two deliverables:

1. `entrywise-emdash`: registry-installable admin connector. Provides setup, notification settings, test workflow, and inbox access.
2. `@entrywise/astro`: optional small frontend package with accessible form markup, inline errors, honeypot, and Turnstile integration. A native EmDash companion can later add editor-selectable form blocks if customers need them.

An admin-only sandbox plugin cannot automatically supply a custom public-page renderer. First release supports a copyable HTML snippet and the Astro component. For no-code placement in the EmDash editor, include the native companion explicitly as a later deployment dependency. Do not promise one-click editor placement from the sandbox registry package alone.

Direct browser submissions avoid sandbox body buffering, preserve the visitor IP for existing checks, and leave delivery in EntryWise. Keep private management credentials out of form markup and client bundles. Do not route large uploads through the sandbox plugin.

## Backend prerequisites

### Separate public and private credentials

Introduce a public submission identifier/key that only authorizes creating submissions. Add independently revocable, site-scoped management tokens with explicit permissions such as reading submissions, editing notification settings, and running tests. Store private tokens hashed in EntryWise; issue the plaintext once. Keep provider credentials in EntryWise.

Existing site keys need a migration and rotation plan. Simply adding new keys leaves older publicly exposed keys able to manage inboxes. Maintain submission compatibility where necessary while explicitly retiring their management authority. Test that a public key cannot list, export, modify, or delete submissions, and that a private token cannot access another site.

### Define a stable integration contract

Expose a minimal connection/bootstrap response: site identity, public form endpoint, allowed origins, supported features, and permitted actions. Add a bounded configuration API for notifications and autoresponder templates. Return masked secret state rather than secret values.

Validate configured fields on the server, not only through HTML attributes. Use the actual route/controller behavior as the source for the API contract; reconcile examples and documentation that have drifted.

### Make delivery observable

Separate submission acceptance from delivery success. Persist per-destination delivery state, attempts, timestamps, and sanitized failure details. Define retry behavior and duplicate suppression before exposing a Retry action. Queue execution can repeat; a successful enqueue does not prove an email arrived.

The setup test should exercise the real delivery path and report accepted, queued, sent/provider-accepted, or failed. Do not label provider acceptance as confirmed inbox delivery. Clearly identify test submissions and recipients.

## First release scope

- Connect an existing EntryWise site using a private management token.
- Validate the connection and display domain and sender readiness.
- Create/configure one contact-form preset: name, email, message, and optional consent checkbox.
- Set notification recipients and enable/disable submitter confirmation with subject and body templates.
- Show required sender/provider setup in EntryWise; avoid duplicating provider secrets in EmDash.
- Generate supported HTML integration and offer an Astro component example.
- Provide a paginated inbox, submission detail, and read/archive/spam actions.
- Run a test submission and display persisted delivery status.
- Provide accessible validation and success/error states, honeypot, and optional Turnstile.

Start with one contact form per connected EntryWise site. The current configuration is site-oriented. For independent sales/support forms, recipients, and field schemas on one website, first add backend form resources and `form_id` routing. Passing a hidden form label alone does not create safe independent routing.

Defer visual drag-and-drop building, conditional/multistep forms, attachments, permanent deletion, broad automation, and provider management until the basic path is proven.

## Plugin permissions and settings

Use `network:request` with the known EntryWise API hostname allowlisted. If arbitrary self-hosted URLs are later supported, explicitly design and document the additional network authority and endpoint validation. Sandboxed plugins cannot access Cloudflare bindings or host environment variables directly. [Capabilities](https://docs.emdashcms.com/plugins/creating-plugins/capabilities/).

Store management tokens as declared secret settings, backed by `EMDASH_ENCRYPTION_KEY`. Return only connection state to the admin browser. Configure rotation and backup of that encryption key. [Settings](https://docs.emdashcms.com/plugins/creating-plugins/settings/).

Keep inbox and configuration routes private with explicit role permissions. Validate all handler inputs. Defer MCP tools until their permission and consent model is needed. [API routes](https://docs.emdashcms.com/plugins/creating-plugins/api-routes/).

Use Block Kit settings forms and paginated tables. Store configuration in plugin settings and small connection state in plugin KV; leave submissions in EntryWise to avoid two competing sources of truth. [Block Kit](https://docs.emdashcms.com/plugins/creating-plugins/block-kit/).

## Suggested package layout

```text
packages/
  emdash-plugin/      manifest, plugin routes, Block Kit admin, tests
  astro/             public form component and optional enhancement script
  client/            shared typed EntryWise API client, if useful to both
examples/
  emdash-cloudflare/  integration site using isolated test resources
docs/
  install.md
  credentials.md
  email-delivery.md
  compatibility.md
```

Keep the Worker backend intact initially. Use a standalone plugin repository or deliberately introduce a workspace; the current nested apps do not by themselves establish a package workspace. Avoid creating a shared client until real duplication justifies it.

## Delivery sequence and acceptance gates

| Phase | Work | Exit condition |
| --- | --- | --- |
| 1 | Credential separation and integration contract | Public key cannot manage submissions; private token is site-scoped and revocable |
| 2 | Delivery status and minimal plugin proof | Plugin connects through the actual sandbox; test delivery state is queryable |
| 3 | Setup and public form | Fresh site can configure and submit a contact form with usable validation |
| 4 | Notifications and inbox | Correct recipient gets notification; autoresponder works; inbox authorization holds |
| 5 | Reuse and packaging | Same build works on three isolated sites with no source edits |
| 6 | Pilot and release | Upgrade preserves settings; installation docs reproduce the result |

Planning estimate: roughly 2–3 weeks for one developer familiar with this stack, including backend prerequisites and a small pilot. This is an engineering estimate, not a researched guarantee; no-code editor blocks and multiple independent forms extend the scope.

## Validation

Test credential misuse and cross-site access, server field validation, invalid Turnstile tokens, safe redirects, disconnected credentials, provider failures, and repeated delivery jobs. Verify that generated HTML contains only public configuration. Test the plugin through EmDash's runtime boundary and run at least one staging Cloudflare integration because local execution does not reproduce deployed resource ceilings.

The reuse acceptance exercise uses three sites, separate credentials and recipients, and at least two notification configurations. Installing, upgrading, disabling, and reconnecting must preserve backend submissions and prevent data crossover. Measure setup time after the EntryWise account/provider is ready; target under ten minutes without editing plugin source.

## Distribution and ongoing maintenance

Pilot privately before registry publication. Publish the sandbox plugin using the official CLI and publisher identity. Add automated releases after the package is stable; EmDash's delegated release process supports repository authorization and provenance. [Automated releases](https://docs.emdashcms.com/plugins/creating-plugins/delegated-releases/).

Record supported EmDash, Astro, plugin CLI, and EntryWise API versions. Run a clean installation and upgrade against each supported release before widening compatibility. Keep presets versioned and apply configuration migrations idempotently. A future Markdown skill can document this repeatable workflow, but the running product consists of code packages and per-site settings.
