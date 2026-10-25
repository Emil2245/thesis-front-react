FROM docker.io/library/node:26-alpine AS build
RUN npm install -g pnpm@12.15.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm run build

FROM docker.io/nginxinc/nginx-unprivileged:1.30-alpine
LABEL org.opencontainers.image.source="https://github.com/emil2245/thesis-front-react"
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
USER 101
