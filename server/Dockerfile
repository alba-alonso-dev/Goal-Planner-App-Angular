# syntax=docker/dockerfile:1
# API de Goal Planner (NestJS). Imagen final: solo dist/ y dependencias de producción, usuario sin privilegios.

# Imagen base de Node (se puede fijar un digest o usar un mirror: --build-arg NODE_IMAGE=…)
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
# El lockfile se resuelve con npm 11 (ver packageManager en package.json)
RUN npm install --global npm@11.20.0
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM ${NODE_IMAGE}
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
# Las migraciones pendientes se aplican al arrancar
CMD ["node", "dist/main.js"]
