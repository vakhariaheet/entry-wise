# EntryWise Self-Hosted Docker Image (Zero Cloudflare Lock-In)
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install production dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy application source, SQL migrations, and static assets
COPY src ./src
COPY migrations ./migrations
COPY public ./public
COPY tsconfig.json ./

# Create persistent data directory for SQLite & file uploads
RUN mkdir -p /app/data/uploads && chown -R bun:bun /app/data

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787
ENV DATABASE_PATH=/app/data/entrywise.sqlite
ENV UPLOAD_DIR=/app/data/uploads
ENV MIGRATIONS_DIR=/app/migrations
ENV PUBLIC_DIR=/app/public

USER bun
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8787/health || exit 1

CMD ["bun", "run", "src/server.ts"]
