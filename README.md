# EntryWise

EntryWise is a powerful form backend service built with [Hono](https://hono.dev/) and designed to run on Cloudflare Workers. It provides a secure, scalable solution for handling form submissions with file uploads, email notifications, and customizable fields.

## Features

- 📝 **Dynamic Form Fields**: Support for various field types including text, email, phone, URL, and file uploads
- 📎 **File Attachments**: Secure file handling with base64 encoding for direct email delivery
- 📧 **Multiple Email Providers**: 
  - Resend
  - MailerSend
  - Mailtrap
  - SMTP2GO
- 🔒 **Security Features**:
  - API key authentication
  - Domain verification
  - Rate limiting
  - Honeypot fields
  - Secure token encryption
- 📊 **Organization Management**:
  - Multi-site support
  - Customizable email settings
  - Field definitions per site
- 📚 **API Documentation**: OpenAPI/Swagger documentation included

## Technology Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Cloudflare D1
- **Rate Limiting**: Cloudflare KV
- **Documentation**: OpenAPI/Swagger

## Getting Started

### Prerequisites

- Node.js 16 or later
- Bun package manager
- Cloudflare account with Workers, D1, and KV access

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/entry-wise.git
   cd entry-wise
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up your Cloudflare Worker environment:
   ```bash
   # Install Wrangler CLI if you haven't already
   npm install -g wrangler

   # Login to Cloudflare
   wrangler login
   ```

4. Create necessary Cloudflare resources:
   ```bash
   # Create D1 database
   wrangler d1 create entry-wise

   # Create KV namespace
   wrangler kv:namespace create RATE_LIMIT
   ```

5. Update `wrangler.jsonc` with your resource IDs

6. Apply database migrations:
   ```bash
   wrangler d1 execute entry-wise --file ./migrations/0001_init.sql
   wrangler d1 execute entry-wise --file ./migrations/0002_email_providers.sql
   ```

### Configuration

1. Set up environment variables in `.dev.vars`:
   ```
   ENCRYPTION_KEY="your-encryption-key"
   BASE_URL="your-worker-url"
   ```

2. Configure your email provider(s) by creating a company with the appropriate credentials:
   ```json
   {
     "name": "Your Company",
     "email_provider": "smtp2go",
     "email_provider_token": "your-provider-token",
     "from_email": "forms@yourdomain.com",
     "from_name": "Your Forms",
     "admin_email": "admin@yourdomain.com"
   }
   ```

### Development

1. Start the development server:
   ```bash
   bun run dev
   ```

2. Generate TypeScript types for Cloudflare bindings:
   ```bash
   bun run cf-typegen
   ```

3. Build for production:
   ```bash
   bun run build
   ```

4. Deploy to Cloudflare Workers:
   ```bash
   bun run deploy
   ```

## API Usage

### Creating a Site

1. Create a company with your preferred email provider
2. Create a site under the company
3. Define form fields for the site
4. Use the provided API key in your forms

### Form Submission

```html
<form action="https://your-worker.workers.dev/submit" method="POST" enctype="multipart/form-data">
  <input type="hidden" name="site_id" value="your_site_id">
  <input type="hidden" name="metadata" value='{"fields":{"name":"John","email":"john@example.com"}}'>
  <input type="file" name="attachments" multiple>
  <button type="submit">Submit</button>
</form>
```

### File Upload Considerations

- Files are automatically converted to base64 for email delivery
- Supported file types and size limits are configurable
- Each file field must be named to match its field definition

## Security

- All API keys and provider tokens are encrypted at rest
- Domain verification ensures forms can only be submitted from authorized domains
- Rate limiting prevents abuse
- Honeypot fields help catch spam submissions

## Email Provider Integration

EntryWise supports four email providers out of the box:

1. **Resend**:
   - Modern email API
   - Simple setup with API key
   - Excellent delivery rates

2. **MailerSend**:
   - Direct file attachments
   - Custom templates support
   - Advanced analytics

3. **Mailtrap**:
   - Perfect for testing
   - Development environment isolation
   - Email debugging features

4. **SMTP2GO**:
   - Reliable SMTP service
   - Detailed sending analytics
   - High delivery rates
   - Excellent support for attachments

## Documentation

API documentation is available at `/docs` when running the service. It provides detailed information about:
- Available endpoints
- Request/response formats
- Authentication requirements
- Field validation rules
- File upload specifications

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
