FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install && pnpm build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
