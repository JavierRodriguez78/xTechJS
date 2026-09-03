FROM node:22-alpine AS build

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY apps/api apps/api
RUN pnpm --filter @xtechjs/api build
RUN pnpm --filter @xtechjs/api deploy --legacy --prod /opt/api

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /opt/api ./

EXPOSE 3000
USER node
CMD ["sh", "-c", "node dist/shared/infrastructure/persistence/data-source.js && node dist/main.js"]