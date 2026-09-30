# syntax=docker/dockerfile:1
# Frontend de Goal Planner: build de Angular (en + es) servido por nginx, que también hace de
# proxy de /api hacia el backend.

# Imagen base de Node (se puede fijar un digest o usar un mirror: --build-arg NODE_IMAGE=…)
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: el script `prepare` instala los hooks de git (husky), que aquí no hacen falta
RUN npm ci --ignore-scripts
COPY angular.json tsconfig*.json ./
COPY public ./public
COPY src ./src
RUN npx ng build

FROM nginx:1.29-alpine
# El entrypoint de la imagen sustituye ${API_UPSTREAM} en la plantilla al arrancar
ENV API_UPSTREAM=http://api:3000
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/goal-planer/browser /usr/share/nginx/html
