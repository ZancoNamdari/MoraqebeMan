# syntax=docker/dockerfile:1

# ---------- deps ----------
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- builder ----------
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Baked into the build at build-time — Next.js inlines NEXT_PUBLIC_*
# values into the client bundle, so this must be passed as a real
# --build-arg at `docker build` time, not a runtime env var (setting
# it only in docker-compose's `environment:` would have no effect on
# what's already compiled into the JS).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

# ---------- runner ----------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# output: "standalone" produces a self-contained server.js plus only
# the node_modules it actually needs — .next/static is NOT included in
# that output and must be copied alongside it separately (a documented
# Next.js requirement). Verified the working case directly: built,
# assembled with this exact two-copy layout, started the server, and
# confirmed a real page returned 200 — did not separately verify what
# breaks if this second COPY line is left out, so treat that specific
# failure mode as documented Next.js behavior, not something re-tested
# here. None of these five apps currently has a public/ directory
# (checked directly) — if one is added later for static assets, a
# matching `COPY --from=builder /app/public ./public` line is needed.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
