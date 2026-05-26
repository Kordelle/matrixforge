FROM node:22-alpine AS base

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# FASTAPI_URL is only used server-side; no need to expose as NEXT_PUBLIC_
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- runner ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# standalone output bundles everything needed
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 7430
ENV PORT=7430
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
