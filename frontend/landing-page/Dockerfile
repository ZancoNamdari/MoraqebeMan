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
# landing-page is mostly a Server Component with no client-side API
# calls — except this analytics beacon, added specifically for visit
# tracking, which is why NEXT_PUBLIC_API_URL is now needed here too,
# unlike before.
ARG NEXT_PUBLIC_FAMILY_PANEL_URL
ARG NEXT_PUBLIC_PATIENT_PANEL_URL
ARG NEXT_PUBLIC_CAREGIVER_PANEL_URL
ARG NEXT_PUBLIC_SUPERVISOR_PANEL_URL
ARG NEXT_PUBLIC_AGENCY_PANEL_URL
ARG NEXT_PUBLIC_ADMIN_PANEL_URL
ARG NEXT_PUBLIC_SUPERUSER_PANEL_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FAMILY_PANEL_URL=${NEXT_PUBLIC_FAMILY_PANEL_URL}
ENV NEXT_PUBLIC_PATIENT_PANEL_URL=${NEXT_PUBLIC_PATIENT_PANEL_URL}
ENV NEXT_PUBLIC_CAREGIVER_PANEL_URL=${NEXT_PUBLIC_CAREGIVER_PANEL_URL}
ENV NEXT_PUBLIC_SUPERVISOR_PANEL_URL=${NEXT_PUBLIC_SUPERVISOR_PANEL_URL}
ENV NEXT_PUBLIC_AGENCY_PANEL_URL=${NEXT_PUBLIC_AGENCY_PANEL_URL}
ENV NEXT_PUBLIC_ADMIN_PANEL_URL=${NEXT_PUBLIC_ADMIN_PANEL_URL}
ENV NEXT_PUBLIC_SUPERUSER_PANEL_URL=${NEXT_PUBLIC_SUPERUSER_PANEL_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

# ---------- runner ----------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
