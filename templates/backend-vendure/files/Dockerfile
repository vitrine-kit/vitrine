# syntax=docker/dockerfile:1
# Vitrine client image on Vendure. One image, two commands (compose): the Vendure server
# (`node dist/index.js`) and the Next storefront (`next start`). Target — VPS.
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
# The command is overridden in docker-compose (web / server).
CMD ["pnpm", "start"]
