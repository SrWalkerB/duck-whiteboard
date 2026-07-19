# syntax=docker/dockerfile:1

# ---- Stage 1: build the static site ----
FROM node:22-alpine AS build
WORKDIR /app

# Install deps first (cached until the lockfile changes).
COPY package.json package-lock.json ./
RUN npm ci

# Build the SPA into /app/dist.
COPY . .
RUN npm run build

# ---- Stage 2: serve with Caddy (automatic HTTPS) ----
FROM caddy:2-alpine
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
