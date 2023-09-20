FROM node:18-alpine AS base


FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile --production


FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY components.json index.html package.json postcss.config.js server.ts tailwind.config.js tsconfig.json vite.config.ts .
COPY dist ./dist
EXPOSE 80
ENV PORT 80
CMD ["node_modules/.bin/vite-node", "server.ts"]
