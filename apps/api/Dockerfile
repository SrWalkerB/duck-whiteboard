FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --include-workspace-root --workspace @duckboard/api

COPY apps/api apps/api
RUN npm run build:api

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api apps/api

CMD ["node", "apps/api/dist/src/main.js"]
