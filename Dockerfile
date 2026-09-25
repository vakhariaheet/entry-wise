# =========================================================
# Stage 1: Build React Dashboard (apps/app)
# =========================================================
FROM oven/bun:1-alpine AS frontend-builder
WORKDIR /build

COPY apps/app/package.json ./apps/app/
COPY package.json ./

WORKDIR /build/apps/app
RUN bun install

COPY apps/app/ ./
RUN bun run build

# =========================================================
# Stage 2: Production Server Runner
# =========================================================
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0

# Install production dependencies
COPY package.json bun.lock ./
RUN bun install --production

# Copy application source code
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY public/ ./public/

# Copy built frontend assets from builder into public directory
COPY --from=frontend-builder /build/apps/app/dist ./public/app

# Data volumes for persistent SQLite and file uploads
VOLUME ["/app/data", "/app/uploads"]

EXPOSE 8787

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8787/ || exit 1

CMD ["bun", "run", "src/server.ts"]
