# ⚡ EntryWise Quickstart & Integration Guide

Get your first form live in under 60 seconds using the **Drop-In Class Binder (`/embed.js`)**, **Pure HTML `<form>`**, or **Direct JSON (`fetch` / React / Next.js)**.

---

## 1. Create a Workspace & Form Endpoint

1. Open the [**EntryWise Console**](https://app.entrywise.si) (or your self-hosted dashboard).
2. Create a **Workspace** (choose Managed Default Email or connect your own Resend / SMTP2GO / MailerSend / Mailtrap / Webhook key).
3. Create a **Site** with your domain (e.g., `acme.com`) and copy your **Site API Key** (`ew_live_...`).

> [!TIP]
> **Auto-Schema Discovery is On by Default:** You do **not** need to pre-define form fields before sending your first submission! When your site has `0` schema fields, EntryWise automatically inspects the first submission's fields, infers their types (`email`, `phone`, `url`, `file`, `text`), and registers your schema automatically.

---

## 2. Choose Your Integration Method

### Method A: `<1.5KB` Drop-In Class Binder (Recommended)

If you want AJAX submission handling (no full-page reload, automatic button loading state, inline accessible status banner, and custom event hooks) without writing JavaScript state management:

```html
<!-- 1. Include the lightweight binder once on your page -->
<script
  src="https://api.entrywise.si/embed.js"
  data-site-key="ew_live_your_site_key"
  defer
></script>

<!-- 2. Add class="entrywise-form" to any <form> -->
<form
  class="entrywise-form"
  data-success="Thank you! We received your message."
>
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Your Email" required />
  <textarea name="message" placeholder="Your Message" required></textarea>

  <button type="submit">Send Message</button>
</form>
```

#### Customizing the Class Name & Attributes
- **Custom Class Name:** Want to bind to `.contact-form` or `.lead-capture` instead of `.entrywise-form`? Pass `data-class="contact-form"` on the `<script>` tag.
- **Self-Hosted Auto-Detection:** When `/embed.js` is loaded from your own Docker or Cloudflare domain (e.g. `https://forms.yourdomain.com/embed.js`), it automatically posts submissions to `https://forms.yourdomain.com/f/YOUR_KEY`.
- **DOM Events:** Listen for `entrywise:success` and `entrywise:error` on your `<form>` element to trigger analytics or custom UI modals:
  ```js
  document.querySelector('.entrywise-form').addEventListener('entrywise:success', (e) => {
    console.log('Submission ID:', e.detail.submission_id);
  });
  ```

---

### Method B: Pure HTML `<form>` (Zero Client JS)

Ideal for static HTML sites, Webflow, Framer, Hugo, Jekyll, or Astro static pages:

```html
<form
  action="https://api.entrywise.si/f/ew_live_your_site_key"
  method="POST"
  enctype="multipart/form-data"
>
  <!-- Invisible Honeypot Anti-Spam -->
  <input type="text" name="_gotcha" style="display:none !important" tabindex="-1" autocomplete="off" />

  <!-- Optional Magic Directives -->
  <input type="hidden" name="_subject" value="New Website Lead from {{name}}" />
  <input type="hidden" name="_redirect" value="https://yourdomain.com/thank-you" />

  <label>
    Full Name
    <input type="text" name="name" required />
  </label>

  <label>
    Work Email
    <input type="email" name="email" required />
  </label>

  <label>
    Attachment (Optional PDF/Image up to 5MB)
    <input type="file" name="attachment" />
  </label>

  <button type="submit">Submit</button>
</form>
```

---

### Method C: Next.js Server Action / React `fetch`

```ts
'use server';

export async function submitContactForm(formData: FormData) {
  const response = await fetch('https://api.entrywise.si/f/ew_live_your_site_key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message'),
      _subject: 'New Contact Inquiry',
    }),
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    return { ok: false, error: problem.detail || 'Submission failed' };
  }

  return await response.json();
}
```

---

## 3. Magic HTML & JSON Directives Reference

All `_`-prefixed directives are processed by EntryWise to customize delivery, sanitized against CRLF injection, and stripped from the stored submission payload so your inbox stays clean:

| Field Name | Behavior |
| :--- | :--- |
| `_subject` | Overrides the admin notification email subject line. Supports `{{field_name}}` variables. |
| `_replyto` | Sets the `Reply-To` email header on the admin notification email. (If omitted, EntryWise automatically uses the `email` field from the submission.) |
| `_cc` | Comma-separated list of up to 5 valid email addresses to CC on the admin notification email. |
| `_redirect` / `_next` | Performs a `303 See Other` redirect after browser form submission. Validated against the site's registered `domain` and `allowed_origins`. |
| `_gotcha` / `_honeypot` / `_hp` / `website_url_hp` | Honeypot bot trap fields. Must remain empty for legitimate users. |
| `cf-turnstile-response` | Cloudflare Turnstile token verified server-side when `turnstile_secret_key` is configured on the site. |

---

## 4. Testing Your Pipeline Without Touching Frontend Code

Before embedding your form, you can verify your entire delivery pipeline (Database commit + Email + Webhooks + Slack/Discord/Airtable/Notion) directly from the Console or via the **Pipeline Diagnostics API**:

```bash
curl -X POST "https://api.entrywise.si/v1/sites/YOUR_SITE_ID/test-submission" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "dispatch_connectors": true }'
```

Test submissions are tagged with `is_test = 1` (`TEST` badge in the Inbox) so you can filter or clear them anytime without polluting production leads.
