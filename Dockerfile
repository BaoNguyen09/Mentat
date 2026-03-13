FROM node:22-slim AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/types/package.json packages/types/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN npm ci --ignore-scripts

COPY packages/types packages/types
COPY apps/api apps/api
COPY apps/web apps/web
COPY tsconfig.base.json ./

RUN npm run build --workspace=packages/types
RUN npm run build --workspace=apps/web
RUN npm run build --workspace=apps/api

FROM node:22-slim AS runtime
WORKDIR /app

COPY --from=base /app/package.json /app/package-lock.json ./
COPY --from=base /app/node_modules node_modules
COPY --from=base /app/packages/types packages/types
COPY --from=base /app/apps/api apps/api
COPY --from=base /app/apps/web/dist apps/web/dist

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "apps/api/dist/index.js"]
