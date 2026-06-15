# syntax=docker/dockerfile:1
# Образ эталонного клиента Vitrine (Next standalone + Payload). Таргет — VPS.
# Приватные пакеты @maks417/* требуют GITHUB_TOKEN (build-arg).
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# --- зависимости -----------------------------------------------------------
FROM base AS deps
ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=${GITHUB_TOKEN}
COPY package.json pnpm-lock.yaml* .npmrc ./
RUN pnpm install --frozen-lockfile || pnpm install

# --- сборка -----------------------------------------------------------------
FROM base AS build
ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=${GITHUB_TOKEN}
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# --- рантайм ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
