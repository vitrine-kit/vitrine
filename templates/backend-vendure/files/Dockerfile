# syntax=docker/dockerfile:1
# Образ клиента Vitrine на Vendure. Один образ, две команды (compose): Vendure-сервер
# (`node dist/index.js`) и витрина Next (`next start`). Таргет — VPS.
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000 3001
# Команда переопределяется в docker-compose (web / server).
CMD ["pnpm", "start"]
